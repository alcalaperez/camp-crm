-- AlterTable
ALTER TABLE "Registration" ADD COLUMN "idDocumentMime" TEXT;
ALTER TABLE "Registration" ADD COLUMN "idDocumentName" TEXT;
ALTER TABLE "Registration" ADD COLUMN "idDocumentPath" TEXT;
ALTER TABLE "Registration" ADD COLUMN "idDocumentSize" INTEGER;
ALTER TABLE "Registration" ADD COLUMN "idDocumentUploadedAt" DATETIME;
