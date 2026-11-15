-- Aggiunge `uploadToken` a Registration: capability token opaco (256 bit)
-- che autorizza l'upload dei documenti dal form pubblico.
--
-- SQLite non ammette DEFAULT (randomblob()) con ALTER TABLE ADD COLUMN,
-- quindi usiamo il pattern RedefineTables (come le migrazioni precedenti):
-- creiamo la nuova tabella, copiamo le righe assegnando a ciascuna un token
-- casuale, poi sostituiamo.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "sottoscrittoFirstName" TEXT NOT NULL,
    "sottoscrittoLastName" TEXT NOT NULL,
    "sottoscrittoTaxId" TEXT NOT NULL,
    "sottoscrittoPhone" TEXT NOT NULL DEFAULT '',
    "sottoscrittoEmail" TEXT NOT NULL DEFAULT '',
    "street" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "privacyConsent" BOOLEAN NOT NULL DEFAULT false,
    "rulesConsent" BOOLEAN NOT NULL DEFAULT false,
    "uploadToken" TEXT NOT NULL,
    CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Registration" (
    "city", "createdAt", "eventId", "id", "notes", "postalCode",
    "privacyConsent", "rulesConsent",
    "sottoscrittoEmail", "sottoscrittoFirstName", "sottoscrittoLastName",
    "sottoscrittoPhone", "sottoscrittoTaxId", "status", "street",
    "updatedAt", "uploadToken"
)
SELECT
    "city", "createdAt", "eventId", "id", "notes", "postalCode",
    "privacyConsent", "rulesConsent",
    "sottoscrittoEmail", "sottoscrittoFirstName", "sottoscrittoLastName",
    "sottoscrittoPhone", "sottoscrittoTaxId", "status", "street",
    "updatedAt", lower(hex(randomblob(32)))
FROM "Registration";

DROP TABLE "Registration";
ALTER TABLE "new_Registration" RENAME TO "Registration";

CREATE UNIQUE INDEX "Registration_uploadToken_key" ON "Registration" ("uploadToken");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
