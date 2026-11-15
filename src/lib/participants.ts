// Helper per costruire un riepilogo testuale dei partecipanti di un'iscrizione,
// usato nelle tabelle (lista iscrizioni, home, pagamenti).

interface ParticipantLike {
  firstName: string;
  lastName: string;
}

/** Es. "Mario Rossi" oppure "Mario Rossi +1" (se più di uno). */
export function participantSummary(
  participants: ParticipantLike[]
): string {
  if (participants.length === 0) return "—";
  const first = participants[0];
  const base = `${first.firstName} ${first.lastName}`.trim();
  if (participants.length === 1) return base;
  return `${base} +${participants.length - 1}`;
}
