/**
 * Cancellazione dei dati scaduti (retention policy, GDPR art. 5(1)(e)).
 *
 * Trova le iscrizioni il cui evento è terminato da più di RETENTION_MONTHS
 * (default 24) mesi e le elimina, inclusi i documenti cifrati sul disco.
 *
 * Modalità:
 *   npm run retention:purge              → DRY-RUN (default), mostra cosa farebbe
 *   npm run retention:purge -- --execute → esegue realmente le cancellazioni
 *
 * Idempotente: può essere rieseguito. Pensato per un cron (es. settimanale):
 *   docker compose exec camp-crm npm run retention:purge -- --execute
 */
import { prisma } from "../src/lib/prisma";
import { purgeRegistrationData } from "../src/lib/registration-cleanup";
import { retentionMonths } from "../src/lib/consent";

async function main() {
  const execute = process.argv.includes("--execute");
  const months = retentionMonths();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  console.log(
    `Retention: ${months} mesi — cutoff eventi terminati prima del ${cutoff.toLocaleDateString(
      "it-IT"
    )} — modalità: ${execute ? "ESECUZIONE" : "DRY-RUN"}`
  );

  // Iscrizioni collegate a eventi la cui data di fine è precedente al cutoff.
  const expired = await prisma.registration.findMany({
    where: { event: { endDate: { lt: cutoff } } },
    include: {
      event: { select: { name: true, endDate: true } },
      participants: { select: { id: true, idDocumentPath: true } },
    },
  });

  if (expired.length === 0) {
    console.log("Nessuna iscrizione scaduta da eliminare.");
    await prisma.$disconnect();
    return;
  }

  console.log(`\nIscrizioni da ${expired.length > 1 ? "eliminare" : "eliminare"}:`);
  let docsCount = 0;
  for (const r of expired) {
    const docs = r.participants.filter((p) => p.idDocumentPath).length;
    docsCount += docs;
    console.log(
      `  • ${r.id} — evento "${r.event.name}" terminato il ` +
        `${new Date(r.event.endDate).toLocaleDateString("it-IT")} — ` +
        `${r.participants.length} partecipanti, ${docs} documento/i`
    );
  }
  console.log(`\nTotale: ${expired.length} iscrizioni, ${docsCount} documenti.`);

  if (!execute) {
    console.log(
      "\n[DRY-RUN] Nessuna cancellazione eseguita. Riesegui con --execute per procedere."
    );
    await prisma.$disconnect();
    return;
  }

  console.log("\nEsecuzione cancellazioni...");
  let purged = 0;
  let failed = 0;
  for (const r of expired) {
    try {
      const { documentsRemoved } = await purgeRegistrationData(r.id);
      console.log(`  ✓ ${r.id} — ${documentsRemoved} documento/i rimossi`);
      purged++;
    } catch (err) {
      console.error(`  ✗ ${r.id} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nFatto: ${purged} eliminate, ${failed} fallite.`);
  await prisma.$disconnect();
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Errore fatale durante il purge:", err);
  prisma.$disconnect().finally(() => {
    process.exitCode = 1;
  });
});
