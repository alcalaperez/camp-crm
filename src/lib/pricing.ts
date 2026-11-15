// Helper per il calcolo delle quote di partecipazione.
//
// Modello di prezzo (definito per evento):
//   priceAdult    — prezzo fisso per ogni adulto
//   priceKid1     — 1° campista
//   priceKid2     — 2° campista
//   priceKid3     — 3° campista
//   priceKid4Plus — dal 4° campista in poi (0 = gratuito)
//
// Esempio (adult 150, kid1 190, kid2 150, kid3 100, kid4+ 0):
//   1 adulto + 3 campisti = 150 + 190 + 150 + 100 = 590

export interface EventPrices {
  priceAdult: number;
  priceKid1: number;
  priceKid2: number;
  priceKid3: number;
  priceKid4Plus: number;
}

/** Prezzo di un campista in base alla sua posizione (1-based). */
export function kidPriceByOrdinal(prices: EventPrices, ordinal: number): number {
  switch (ordinal) {
    case 1:
      return prices.priceKid1;
    case 2:
      return prices.priceKid2;
    case 3:
      return prices.priceKid3;
    default:
      // 4° e successivi
      return prices.priceKid4Plus;
  }
}

/** Totale quota per una registration con `adultCount` adulti e `kidCount` campisti. */
export function calculateEventTotal(
  prices: EventPrices,
  adultCount: number,
  kidCount: number
): number {
  let total = adultCount * prices.priceAdult;
  for (let i = 1; i <= kidCount; i++) {
    total += kidPriceByOrdinal(prices, i);
  }
  return total;
}

/** Formatta un importo in euro, stile italiano (es. 340 → "€340,00"). */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/** Metodo di pagamento considerato uno sconto (non denaro reale). */
export const DISCOUNT_METHOD = "SCONTO";

export interface PaymentLike {
  amount: number;
  paid: boolean;
  paymentMethod: string;
}

export interface RegistrationBalance {
  /** Quota totale calcolata in base a prezzi e partecipanti. */
  total: number;
  /** Denaro reale effettivamente ricevuto (solo pagamenti non-sconto, paid). */
  paid: number;
  /** Totale sconti applicati (somma degli importi SCONTO). */
  discount: number;
  /** Quota coperta = denaro reale + sconti. */
  covered: number;
  /** Saldo ancora dovuto = total − covered. */
  balance: number;
}

/**
 * Calcola il bilancio di un'iscrizione: quota totale, denaro reale ricevuto,
 * sconti applicati, quota coperta e saldo dovuto.
 *
 * Regola: uno sconto (metodo SCONTO) copre sempre il suo importo, NON conta
 * come denaro ricevuto. Il saldo scende quindi di conseguenza.
 */
export function computeRegistrationBalance(
  quotaTotal: number,
  payments: PaymentLike[]
): RegistrationBalance {
  let paid = 0; // denaro reale
  let discount = 0; // sconti
  for (const p of payments) {
    if (p.paymentMethod === DISCOUNT_METHOD) {
      discount += p.amount;
    } else if (p.paid) {
      paid += p.amount;
    }
  }
  const covered = paid + discount;
  return {
    total: quotaTotal,
    paid,
    discount,
    covered,
    balance: quotaTotal - covered,
  };
}
