// Helper per il limite di partecipanti di un evento.
//
// participantLimit (su Event): numero massimo di partecipanti (adulti + campisti)
// sommati su tutte le iscrizioni NON cancellate. null = illimitato.
//
// Una iscrizione CANCELLED non conta: libera i posti (le persone non partecipano).

import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Normalizza il valore del limite di partecipanti proveniente da un form/API.
 * - null / "" / undefined / non finito / < 0  → null (illimitato)
 * - altrimenti intero >= 0
 */
export function normalizeParticipantLimit(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

/**
 * Conta i partecipanti (adulti + campisti) di un evento, escludendo le
 * iscrizioni CANCELLED.
 *
 * @param tx       client Prisma o handle di transazione (per atomicità).
 * @param excludeRegistrationId  se fornito, esclude quell'iscrizione dal conteggio
 *   (usato in modifica: le sue righe stanno per essere sostituite da deleteMany+create).
 */
export async function countActiveParticipants(
  tx: PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  eventId: string,
  excludeRegistrationId?: string
): Promise<number> {
  return tx.participant.count({
    where: {
      registration: {
        eventId,
        status: { not: "CANCELLED" },
        ...(excludeRegistrationId
          ? { id: { not: excludeRegistrationId } }
          : {}),
      },
    },
  });
}

/**
 * Verifica che `newParticipantCount` persone in più stiano nel limite dell'evento.
 * Ritorna null se ok, altrimenti un messaggio di errore in italiano.
 *
 * @param current  partecipanti già conteggiati (esclusa l'iscrizione in modifica).
 * @param adding   numero di partecipanti della nuova/modificata iscrizione.
 */
export function checkCapacity(
  limit: number | null,
  current: number,
  adding: number
): string | null {
  if (limit === null) return null;
  const remaining = limit - current;
  if (adding > remaining) {
    if (remaining <= 0) {
      return `Posti esauriti per questo evento (limite ${limit}).`;
    }
    return `Posti insufficienti: rimangono ${remaining} posti su ${limit}, ma ne servono ${adding}.`;
  }
  return null;
}
