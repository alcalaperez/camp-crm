import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { encryptDocument, decryptDocument } from "@/lib/document-crypto";

// Cartella di base per i file caricati. In produzione può essere mappata
// (bind mount) a un disco esterno tramite la variabile d'ambiente UPLOADS_DIR.
// Risolta lazy (a runtime) invece che a caricamento del modulo, così la
// variabile d'ambiente viene letta al momento dell'uso e non durante il build.
let _uploadsDir: string | null = null;
export function getUploadsDir(): string {
  if (_uploadsDir === null) {
    _uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? "./data/uploads");
  }
  return _uploadsDir;
}

// Un documento d'identità: immagini o PDF.
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export class UploadValidationError extends Error {}

/** Estrae l'estensione (in lowercase, senza punto) dal nome originale, se sicura. */
function safeExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace(/^\.+/, "");
  // Limita a caratteri alfanumerici per evitare sorprese nel filesystem.
  return /^[a-z0-9]+$/.test(ext) ? ext : "";
}

/** Converte un codice mime ammesso nell'estensione file corrispondente. */
function mimeToExtension(mime: string): string {
  switch (mime) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

/**
 * Cartella su disco dedicata a un singolo partecipante:
 *   <UPLOADS_DIR>/participants/<participantId>/
 */
function participantDir(participantId: string): string {
  return path.join(getUploadsDir(), "participants", participantId);
}

export interface UploadResult {
  path: string;
  name: string;
  mime: string;
  size: number;
}

/**
 * Valida e salva un documento caricato. Il nome file su disco è generato
 * (UUID + estensione derivata dal mime), così non è mai controllato dal client.
 * Restituisce i metadati da salvare nel DB.
 */
export async function saveDocument(
  participantId: string,
  file: File
): Promise<UploadResult> {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new UploadValidationError(
      `Tipo di file non supportato: ${file.type || "sconosciuto"}. ` +
        `Ammessi: ${ALLOWED_MIME_TYPES.join(", ")}.`
    );
  }

  if (file.size <= 0) {
    throw new UploadValidationError("Il file è vuoto.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      `File troppo grande (${formatBytes(file.size)}). ` +
        `Massimo ${formatBytes(MAX_UPLOAD_BYTES)}.`
    );
  }

  const dir = participantDir(participantId);
  await fs.mkdir(dir, { recursive: true });

  // Estensione preferita dal mime, fallback a quella del nome originale.
  const ext = mimeToExtension(file.type) || safeExtension(file.name);
  const storedName = ext ? `${randomUUID()}.${ext}` : randomUUID();
  const absPath = path.join(dir, storedName);

  const buffer = Buffer.from(await file.arrayBuffer());
  // Cifratura a riposo (AES-256-GCM). Il file su disco contiene l'envelope
  // cifrata; la dimensione salvata nel DB resta quella del plaintext.
  const ciphered = encryptDocument(buffer);
  await fs.writeFile(absPath, ciphered);

  return {
    path: storedName,
    name: file.name || storedName,
    mime: file.type,
    size: file.size,
  };
}

/**
 * Risolve un nome file salvato nel suo path assoluto sul disco.
 * Accetta solo il basename (rifiuta separatori / .. per evitare path traversal).
 */
export function documentAbsolutePath(
  participantId: string,
  storedName: string
): string {
  if (
    !storedName ||
    storedName.includes("/") ||
    storedName.includes("\\") ||
    storedName.includes("..")
  ) {
    throw new Error("Nome file non valido.");
  }
  return path.join(participantDir(participantId), storedName);
}

/** Elimina un documento dal disco se esiste. Non solleva se il file manca. */
export async function deleteDocument(
  participantId: string,
  storedName: string | null | undefined
): Promise<void> {
  if (!storedName) return;
  try {
    await fs.unlink(documentAbsolutePath(participantId, storedName));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

/** Legge i byte (plaintext) di un documento salvato, decifrandone l'envelope. */
export async function readDocument(
  participantId: string,
  storedName: string
): Promise<Buffer> {
  const ciphered = await fs.readFile(documentAbsolutePath(participantId, storedName));
  return decryptDocument(ciphered);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
