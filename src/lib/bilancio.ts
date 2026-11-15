// Helper per la sezione Bilancio: entrate (quote partecipanti + entrate extra)
// e uscite (spese custom), con il saldo complessivo del camp.
//
// Le entrate dai partecipanti sono il denaro reale già ricevuto (pagamenti
// paid non-sconto, vedi `pricing.ts`). Le iscrizioni CANCELLED sono escluse:
// il loro pagamento si presume rimborsato.

import {
  calculateEventTotal,
  DISCOUNT_METHOD,
  type EventPrices,
  type PaymentLike,
} from "./pricing";

/** Categorie di spesa selezionabili nel form "Nuova Spesa". */
export const EXPENSE_CATEGORIES = [
  "CIBO",
  "TRASPORTI",
  "STRUTTURA",
  "MATERIALI",
  "ATTIVITA",
  "PERSONALE",
  "GENERALE",
] as const;

/** Origini delle entrate extra selezionabili nel form "Nuova Entrata". */
export const INCOME_SOURCES = [
  "DONAZIONE",
  "CONTRIBUTO",
  "SOVENZIONE",
  "RIMBORSO",
  "ALTRO",
] as const;

export const expenseCategoryLabels: Record<string, string> = {
  CIBO: "Cibo",
  TRASPORTI: "Trasporti",
  STRUTTURA: "Struttura",
  MATERIALI: "Materiali",
  ATTIVITA: "Attività",
  PERSONALE: "Personale",
  GENERALE: "Generale",
};

export const incomeSourceLabels: Record<string, string> = {
  DONAZIONE: "Donazione",
  CONTRIBUTO: "Contributo",
  SOVENZIONE: "Sovvenzione",
  RIMBORSO: "Rimborso",
  ALTRO: "Altro",
};

export interface ExpenseLike {
  amount: number;
  category: string;
  eventId: string;
}

export interface IncomeLike {
  amount: number;
  source: string;
  eventId: string;
}

export interface RegistrationIncomeLike {
  eventId: string;
  status: string;
  /** Quota totale calcolata (prezzi evento × partecipanti). */
  quotaTotal: number;
  /** Denaro reale ricevuto (pagamenti paid non-sconto). */
  paid: number;
  /** Sconti applicati (metodo SCONTO). */
  discount: number;
}

/**
 * Aggrega i dati di un'iscrizione per il bilancio: quota totale, denaro
 * ricevuto e sconti. Da chiamare lato server (o dopo il fetch) una sola
 * volta per iscrizione.
 */
export function computeRegistrationIncome(
  eventId: string,
  status: string,
  prices: EventPrices,
  adultCount: number,
  kidCount: number,
  payments: PaymentLike[]
): RegistrationIncomeLike {
  const quotaTotal = calculateEventTotal(prices, adultCount, kidCount);
  let paid = 0;
  let discount = 0;
  for (const p of payments) {
    if (p.paymentMethod === DISCOUNT_METHOD) discount += p.amount;
    else if (p.paid) paid += p.amount;
  }
  return { eventId, status, quotaTotal, paid, discount };
}

export interface CampBalance {
  /** Denaro reale ricevuto dai partecipanti (pagamenti paid non-sconto). */
  participantIncome: number;
  /** Entrate extra registrate manualmente (donazioni, contributi, ...). */
  otherIncome: number;
  /** Totale entrate = partecipanti + extra. */
  totalIncome: number;
  /** Totale uscite (spese). */
  totalExpenses: number;
  /** Saldo del camp = entrate − uscite. */
  balance: number;
  /** Totale quote teoriche delle iscrizioni attive (attese, non ancora incassate). */
  expectedIncome: number;
  /** Somma degli sconti applicati sulle iscrizioni attive. */
  totalDiscount: number;
  /** Saldo ancora dovuto dai partecipanti (attese − coperto). */
  outstanding: number;
}

/**
 * Calcola il bilancio del camp su un insieme di dati già filtrati per evento.
 *
 * - Le iscrizioni CANCELLED non contano: né come quota attesa né come entrate.
 * - Gli sconti (metodo SCONTO) non sono denaro reale: coprono la quota ma non
 *   entrano nel bilancio (coerente con `computeRegistrationBalance`).
 */
export function computeCampBalance(
  registrations: RegistrationIncomeLike[],
  expenses: ExpenseLike[],
  incomes: IncomeLike[]
): CampBalance {
  let participantIncome = 0;
  let expectedIncome = 0;
  let totalDiscount = 0;

  for (const reg of registrations) {
    if (reg.status === "CANCELLED") continue;
    participantIncome += reg.paid;
    expectedIncome += reg.quotaTotal;
    totalDiscount += reg.discount;
  }

  const otherIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = participantIncome + otherIncome;

  return {
    participantIncome,
    otherIncome,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    expectedIncome,
    totalDiscount,
    // Se i partecipanti hanno pagato più del dovuto (credito), non c'è nulla
    // da incassare: il saldo non scende sotto zero.
    outstanding: Math.max(0, expectedIncome - participantIncome - totalDiscount),
  };
}
