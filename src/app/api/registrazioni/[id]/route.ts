import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { purgeRegistrationData } from "@/lib/registration-cleanup";
import {
  checkCapacity,
  countActiveParticipants,
} from "@/lib/participant-cap";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: {
      event: true,
      participants: { orderBy: { createdAt: "asc" } },
      payments: { include: { recordedBy: true } },
    },
  });

  if (!registration) {
    return NextResponse.json({ error: "Iscrizione non trovata" }, { status: 404 });
  }

  return NextResponse.json(registration);
}

interface ParticipantInput {
  id?: string;
  role: string; // ADULT | KID
  firstName: string;
  lastName: string;
  birthDate: string;
  taxId?: string;
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Aggiornamento parziale: includi nel `data` solo i campi effettivamente
  // presenti nel body. In questo modo un aggiornamento solo dello stato
  // (es. { status: "CONFIRMED" }) non azzera gli altri campi e non cancella
  // i partecipanti. I partecipanti vengono sincronizzati solo se il body
  // include `participants`.
  const data: Record<string, unknown> = {};

  if (body.sottoscrittoFirstName !== undefined)
    data.sottoscrittoFirstName = body.sottoscrittoFirstName;
  if (body.sottoscrittoLastName !== undefined)
    data.sottoscrittoLastName = body.sottoscrittoLastName;
  if (body.sottoscrittoPhone !== undefined)
    data.sottoscrittoPhone = body.sottoscrittoPhone;
  if (body.sottoscrittoEmail !== undefined)
    data.sottoscrittoEmail = body.sottoscrittoEmail;
  if (body.street !== undefined) data.street = body.street;
  if (body.postalCode !== undefined) data.postalCode = body.postalCode;
  if (body.city !== undefined) data.city = body.city;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.status !== undefined) data.status = body.status;

  const participants: ParticipantInput[] = Array.isArray(body.participants)
    ? body.participants
    : [];

  // Sincronizza i partecipanti solo se la richiesta li include esplicitamente.
  if (Array.isArray(body.participants)) {
    const newParticipants = participants
      .filter(
        (p) =>
          p &&
          typeof p.firstName === "string" &&
          p.firstName.trim() !== "" &&
          typeof p.lastName === "string" &&
          p.lastName.trim() !== "" &&
          typeof p.birthDate === "string" &&
          p.birthDate.trim() !== ""
      )
      .map((p) => ({
        role: p.role === "ADULT" ? "ADULT" : "KID",
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: p.birthDate,
        taxId: p.taxId ?? "",
      }));

    // Se l'evento ha un limite, verifica che i nuovi partecipanti ci stiano
    // (escludendo questa iscrizione, le cui righe stanno per essere sostituite).
    const reg = await prisma.registration.findUnique({
      where: { id },
      select: { eventId: true, event: { select: { participantLimit: true } } },
    });
    const limit = reg?.event.participantLimit ?? null;

    if (limit !== null) {
      const current = await countActiveParticipants(
        prisma,
        reg!.eventId,
        id
      );
      const err = checkCapacity(limit, current, newParticipants.length);
      if (err) {
        return NextResponse.json({ error: err }, { status: 409 });
      }
    }

    data.participants = { deleteMany: {}, create: newParticipants };
  }

  // Esegui l'update in transazione quando si toccano i partecipanti: ricontrolla
  // il limite dentro la tx (atomicità con altre scritture concorrenti).
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      if (
        Array.isArray(body.participants) &&
        data.participants &&
        typeof data.participants === "object"
      ) {
        const reg = await tx.registration.findUnique({
          where: { id },
          select: { eventId: true, event: { select: { participantLimit: true } } },
        });
        const limit = reg?.event.participantLimit ?? null;
        if (limit !== null) {
          const createList = (data.participants as { create: unknown[] }).create;
          const current = await countActiveParticipants(tx, reg!.eventId, id);
          const err = checkCapacity(limit, current, createList.length);
          if (err) throw new Error(err);
        }
      }
      return tx.registration.update({
        where: { id },
        data,
        include: { participants: { orderBy: { createdAt: "asc" } } },
      });
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Posti insufficienti." },
      { status: 409 }
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;

  // Elimina l'iscrizione, i partecipanti (cascade), i pagamenti (cascade) e i
  // file dei documenti cifrati sul disco (purgeRegistrationData). Non lascia
  // più orfani sul filesystem.
  await purgeRegistrationData(id);

  return NextResponse.json({ success: true });
}
