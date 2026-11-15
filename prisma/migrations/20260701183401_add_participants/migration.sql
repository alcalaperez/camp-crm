-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "taxId" TEXT NOT NULL DEFAULT '',
    "idDocumentPath" TEXT,
    "idDocumentName" TEXT,
    "idDocumentMime" TEXT,
    "idDocumentSize" INTEGER,
    "idDocumentUploadedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
-- SQLite non supporta ALTER TABLE DROP COLUMN in modo diretto per le colonne
-- con dati, quindi ricrea la tabella Registration senza le colonne camper* e idDocument*.
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
    "updatedAt" DATETIME NOT NULL
);

-- Migrates existing registrations (drops camper/idDocument data).
INSERT INTO "new_Registration" ("id", "eventId", "sottoscrittoFirstName", "sottoscrittoLastName", "sottoscrittoTaxId", "sottoscrittoPhone", "sottoscrittoEmail", "street", "postalCode", "city", "status", "notes", "createdAt", "updatedAt")
SELECT "id", "eventId", "sottoscrittoFirstName", "sottoscrittoLastName", "sottoscrittoTaxId", "sottoscrittoPhone", "sottoscrittoEmail", "street", "postalCode", "city", "status", "notes", "createdAt", "updatedAt"
FROM "Registration";

DROP TABLE "Registration";
ALTER TABLE "new_Registration" RENAME TO "Registration";

-- CreateIndex
CREATE INDEX "Participant_registrationId_idx" ON "Participant"("registrationId");
