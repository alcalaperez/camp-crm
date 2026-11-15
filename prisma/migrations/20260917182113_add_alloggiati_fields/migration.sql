-- AlterTable
ALTER TABLE "Registration" ADD COLUMN "stayDays" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "taxId" TEXT NOT NULL DEFAULT '',
    "nationality" TEXT NOT NULL DEFAULT '',
    "birthPlace" TEXT NOT NULL DEFAULT '',
    "sex" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "idDocumentPath" TEXT,
    "idDocumentName" TEXT,
    "idDocumentMime" TEXT,
    "idDocumentSize" INTEGER,
    "idDocumentUploadedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Participant" ("birthDate", "createdAt", "firstName", "id", "idDocumentMime", "idDocumentName", "idDocumentPath", "idDocumentSize", "idDocumentUploadedAt", "lastName", "nationality", "notes", "registrationId", "role", "taxId") SELECT "birthDate", "createdAt", "firstName", "id", "idDocumentMime", "idDocumentName", "idDocumentPath", "idDocumentSize", "idDocumentUploadedAt", "lastName", "nationality", "notes", "registrationId", "role", "taxId" FROM "Participant";
DROP TABLE "Participant";
ALTER TABLE "new_Participant" RENAME TO "Participant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
