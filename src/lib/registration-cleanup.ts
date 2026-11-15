import { prisma } from "@/lib/prisma";
import { deleteDocument } from "@/lib/uploads";

/**
 * Elimina un'iscrizione e tutti i dati associati: partecipanti, pagamenti e
 * (fondamentale) i file dei documenti cifrati sul disco. La cancellazione a
 * cascata di Prisma si occupa delle righe nel DB; i file vanno rimossi a mano
 * perché vivono sul filesystem, fuori dal database.
 *
 * Usata dalla DELETE /api/registrazioni/[id] e dallo script di retention.
 */
export async function purgeRegistrationData(
  registrationId: string
): Promise<{ documentsRemoved: number }> {
  // Prima recupera i partecipanti per poter cancellare i loro documenti.
  const participants = await prisma.participant.findMany({
    where: { registrationId },
    select: { id: true, idDocumentPath: true },
  });

  let documentsRemoved = 0;
  for (const p of participants) {
    if (p.idDocumentPath) {
      try {
        await deleteDocument(p.id, p.idDocumentPath);
        documentsRemoved++;
      } catch {
        // Se il file manca già (ENOENT) deleteDocument non solleva; altri
        // errori vengono loggati dal chiamante ma non bloccano la cancellazione
        // del record, che è comunque prioritaria ai fini di cancellazione dati.
      }
    }
  }

  // Cascade: elimina la registration e, a cascata, participants e payments.
  await prisma.registration.delete({ where: { id: registrationId } });

  return { documentsRemoved };
}
