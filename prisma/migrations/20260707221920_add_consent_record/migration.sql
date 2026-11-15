-- AlterTable
ALTER TABLE "Registration" ADD COLUMN "privacyConsentAt" DATETIME;
ALTER TABLE "Registration" ADD COLUMN "privacyPolicyVersion" TEXT;

-- Backfill: le iscrizioni esistenti avevano già prestato il consenso (booleano),
-- ma senza timestamp/versione. Usiamo createdAt come proxy e versione "1.0".
UPDATE "Registration"
SET "privacyConsentAt" = "createdAt",
    "privacyPolicyVersion" = '1.0'
WHERE "privacyConsent" = 1
  AND "privacyConsentAt" IS NULL;
