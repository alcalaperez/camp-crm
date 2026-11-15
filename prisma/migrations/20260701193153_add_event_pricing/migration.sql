-- DropIndex
DROP INDEX "Participant_registrationId_idx";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceAdult" REAL NOT NULL DEFAULT 0,
    "priceKid1" REAL NOT NULL DEFAULT 0,
    "priceKid2" REAL NOT NULL DEFAULT 0,
    "priceKid3" REAL NOT NULL DEFAULT 0,
    "priceKid4Plus" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Event" ("active", "createdAt", "endDate", "id", "location", "name", "startDate", "year") SELECT "active", "createdAt", "endDate", "id", "location", "name", "startDate", "year" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
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
    CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Registration" ("city", "createdAt", "eventId", "id", "notes", "postalCode", "sottoscrittoEmail", "sottoscrittoFirstName", "sottoscrittoLastName", "sottoscrittoPhone", "sottoscrittoTaxId", "status", "street", "updatedAt") SELECT "city", "createdAt", "eventId", "id", "notes", "postalCode", "sottoscrittoEmail", "sottoscrittoFirstName", "sottoscrittoLastName", "sottoscrittoPhone", "sottoscrittoTaxId", "status", "street", "updatedAt" FROM "Registration";
DROP TABLE "Registration";
ALTER TABLE "new_Registration" RENAME TO "Registration";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
