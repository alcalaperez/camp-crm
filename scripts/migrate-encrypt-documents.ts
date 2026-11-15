/**
 * Migrazione una-tantum: cifra a riposo tutti i documenti d'identità esistenti.
 *
 * Idempotente: se eseguita più volte, salta i file già cifrati (rilevati dal
 * magic "CCLE" in testa all'envelope). Atomicità per-file: scrive un file
 * temporaneo e lo rinomina, così un'interruzione lascia ogni file o tutto in
 * chiaro o tutto cifrato (mai a metà).
 *
 * Uso:
 *   npm run encrypt:migrate            # locale, contro DATABASE_URL
 *   docker compose exec camp-crm npm run encrypt:migrate
 *
 * Prerequisiti:
 *   - DOCUMENT_ENCRYPTION_KEY impostata (vedi README, sezione "Sicurezza dei documenti")
 */
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import {
  encryptDocument,
  isEncryptedEnvelope,
  requireDocumentKey,
} from "../src/lib/document-crypto";
import { documentAbsolutePath, getUploadsDir } from "../src/lib/uploads";

async function main() {
  // Forza la validazione della chiave prima di toccare qualsiasi file.
  requireDocumentKey();
  // Solo per leggibilità nel log: mostra dove stiamo leggendo.
  console.log(`Cartella upload: ${getUploadsDir()}`);

  const participants = await prisma.participant.findMany({
    where: { idDocumentPath: { not: null } },
    select: { id: true, idDocumentPath: true },
  });

  let encrypted = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of participants) {
    const storedName = p.idDocumentPath!;
    const id = p.id;

    let absPath: string;
    try {
      absPath = documentAbsolutePath(id, storedName);
    } catch (err) {
      console.error(`✗ ${id} — nome file non valido "${storedName}": ${(err as Error).message}`);
      failed++;
      continue;
    }

    let original: Buffer;
    try {
      original = await fs.readFile(absPath);
    } catch (err) {
      console.error(`✗ ${id} — impossibile leggere ${absPath}: ${(err as Error).message}`);
      failed++;
      continue;
    }

    if (isEncryptedEnvelope(original)) {
      console.log(`• ${id} — già cifrato, salto`);
      skipped++;
      continue;
    }

    let ciphered: Buffer;
    try {
      ciphered = encryptDocument(original);
    } catch (err) {
      console.error(`✗ ${id} — cifratura fallita: ${(err as Error).message}`);
      failed++;
      continue;
    }

    // Scrivi un file temporaneo fratello, poi rinomina (atomico sullo stesso FS).
    const tmpPath = absPath + ".encrypting.tmp";
    try {
      await fs.writeFile(tmpPath, ciphered);
      await fs.rename(tmpPath, absPath);
      console.log(`✓ ${id} — cifrato ${storedName}`);
      encrypted++;
    } catch (err) {
      console.error(`✗ ${id} — scrittura fallita: ${(err as Error).message}`);
      failed++;
      try {
        await fs.unlink(tmpPath);
      } catch {
        // ignore: il file tmp potrebbe non esistere
      }
    }
  }

  console.log(
    `\nRiepilogo: ${encrypted} cifrati, ${skipped} saltati (già cifrati), ${failed} falliti`
  );

  await prisma.$disconnect();
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Errore fatale durante la migrazione:", err);
  prisma.$disconnect().finally(() => {
    process.exitCode = 1;
  });
});
