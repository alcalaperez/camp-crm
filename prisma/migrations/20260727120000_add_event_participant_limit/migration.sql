-- AlterTable
-- Aggiunge un limite opzionale di partecipanti all'evento (null = illimitato).
ALTER TABLE "Event" ADD COLUMN "participantLimit" INTEGER;
