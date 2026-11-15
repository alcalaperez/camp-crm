import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  saveDocument,
  deleteDocument,
  readDocument,
  UploadValidationError,
} from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

/**
 * Confronta due token in tempo costante per evitare attacchi timing.
 * Restituisce sempre false se le lunghezze differiscono (dopo aver comunque
 * confrontato per non leakare la lunghezza attesa tramite il tempo).
 */
function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Confronto fittizio per non variare il tempo di esecuzione in base
    // alla sola lunghezza: timingSafeEqual richiede lunghezze uguali.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

/** GET — serve il documento in linea (immagine/PDF). Solo staff autenticato. */
export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;

  const participant = await prisma.participant.findUnique({
    where: { id },
    select: {
      idDocumentPath: true,
      idDocumentName: true,
      idDocumentMime: true,
    },
  });

  if (!participant) {
    return NextResponse.json(
      { error: "Partecipante non trovato" },
      { status: 404 }
    );
  }

  if (!participant.idDocumentPath) {
    return NextResponse.json(
      { error: "Nessun documento caricato" },
      { status: 404 }
    );
  }

  let bytes: Buffer;
  try {
    bytes = await readDocument(id, participant.idDocumentPath);
  } catch {
    return NextResponse.json(
      { error: "File non trovato sul disco" },
      { status: 404 }
    );
  }

  const filename = participant.idDocumentName ?? participant.idDocumentPath;
  // Inline: immagini/PDF vengono renderizzati dal browser, non scaricati.
  const disposition = `inline; filename="${filename.replace(/"/g, "")}"`;
  const mime = participant.idDocumentMime ?? "application/octet-stream";

  return new Response(new Blob([new Uint8Array(bytes)], { type: mime }), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-cache",
    },
  });
}

/** POST — carica (o sostituisce) il documento per un partecipante. */
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const { id } = await params;

  const participant = await prisma.participant.findUnique({
    where: { id },
    select: {
      idDocumentPath: true,
      registration: { select: { uploadToken: true } },
    },
  });

  if (!participant) {
    return NextResponse.json(
      { error: "Partecipante non trovato" },
      { status: 404 }
    );
  }

  // Autorizzazione. Lo staff autenticato è sempre abilitato. Altrimenti serve
  // un token di upload (capability) valido per l'iscrizione del partecipante:
  // il form pubblico lo riceve alla creazione dell'iscrizione e lo invia
  // nell'header X-Upload-Token. Sostituisce la vecchia logica basata su una
  // finestra temporale di 10 minuti.
  if (!session) {
    const expected = participant.registration.uploadToken;
    const provided = request.headers.get("x-upload-token") ?? "";
    if (!provided || !tokensMatch(provided, expected)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Richiesta multipart non valida" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Nessun file ricevuto (campo "file" mancante)' },
      { status: 400 }
    );
  }

  let saved;
  try {
    saved = await saveDocument(id, file);
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  // Elimina il vecchio file dal disco, se presente e diverso.
  if (participant.idDocumentPath && participant.idDocumentPath !== saved.path) {
    await deleteDocument(id, participant.idDocumentPath);
  }

  const updated = await prisma.participant.update({
    where: { id },
    data: {
      idDocumentPath: saved.path,
      idDocumentName: saved.name,
      idDocumentMime: saved.mime,
      idDocumentSize: saved.size,
      idDocumentUploadedAt: new Date(),
    },
    select: {
      idDocumentPath: true,
      idDocumentName: true,
      idDocumentMime: true,
      idDocumentSize: true,
      idDocumentUploadedAt: true,
    },
  });

  return NextResponse.json(updated, { status: 201 });
}

/** DELETE — rimuove il documento dal disco e azzera i metadati nel DB. */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;

  const participant = await prisma.participant.findUnique({
    where: { id },
    select: { idDocumentPath: true },
  });

  if (!participant) {
    return NextResponse.json(
      { error: "Partecipante non trovato" },
      { status: 404 }
    );
  }

  await deleteDocument(id, participant.idDocumentPath);

  await prisma.participant.update({
    where: { id },
    data: {
      idDocumentPath: null,
      idDocumentName: null,
      idDocumentMime: null,
      idDocumentSize: null,
      idDocumentUploadedAt: null,
    },
  });

  return NextResponse.json({ success: true });
}
