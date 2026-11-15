"use client";

import { useMemo, useState } from "react";
import { participantSummary } from "@/lib/participants";
import { DISCOUNT_METHOD, formatEuro } from "@/lib/pricing";

const paymentMethodLabels: Record<string, string> = {
  CONTANTI: "Contanti",
  BONIFICO: "Bonifico",
  CARTA: "Carta",
  [DISCOUNT_METHOD]: "Sconto",
};

export interface PaymentRow {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string | null;
  notes: string;
  recordedByName: string;
  registration: {
    sottoscrittoFirstName: string;
    sottoscrittoLastName: string;
    eventName: string;
    eventId: string;
    participants: { firstName: string; lastName: string }[];
  };
}

const selectClass =
  "w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white";

const inputClass =
  "w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";

export function PagamentiFilters({
  payments,
  events,
}: {
  payments: PaymentRow[];
  events: { id: string; name: string }[];
}) {
  const [eventFilter, setEventFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      if (
        eventFilter !== "ALL" &&
        p.registration.eventId !== eventFilter
      )
        return false;
      if (methodFilter !== "ALL" && p.paymentMethod !== methodFilter)
        return false;
      if (q) {
        const names = [
          p.registration.sottoscrittoFirstName,
          p.registration.sottoscrittoLastName,
          ...p.registration.participants.flatMap((pt) => [
            pt.firstName,
            pt.lastName,
          ]),
        ]
          .join(" ")
          .toLowerCase();
        if (!names.includes(q)) return false;
      }
      return true;
    });
  }, [payments, eventFilter, methodFilter, query]);

  // Statistiche riflesse sui filtri (denaro reale esclusi gli sconti).
  const realPayments = filtered.filter(
    (p) => p.paymentMethod !== DISCOUNT_METHOD
  );
  const totalReceived = realPayments.reduce((s, p) => s + p.amount, 0);
  const totalDiscount = filtered
    .filter((p) => p.paymentMethod === DISCOUNT_METHOD)
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      {/* Riepilogo (riflette i filtri) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Pagamenti registrati</p>
          <p className="text-3xl font-bold text-zinc-900">
            {realPayments.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Totale ricevuto</p>
          <p className="text-3xl font-bold text-emerald-700">
            {formatEuro(totalReceived)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Totale sconti</p>
          <p className="text-3xl font-bold text-sky-700">
            {formatEuro(totalDiscount)}
          </p>
        </div>
      </div>

      {/* Barra filtri */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Evento</label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className={selectClass}
            >
              <option value="ALL">Tutti gli eventi</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Metodo</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className={selectClass}
            >
              <option value="ALL">Tutti</option>
              <option value="CONTANTI">Contanti</option>
              <option value="BONIFICO">Bonifico</option>
              <option value="CARTA">Carta</option>
              <option value={DISCOUNT_METHOD}>Sconto</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Ricerca nomi
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Genitore o campista…"
              className={inputClass}
            />
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-2">
          {filtered.length} risultat{filtered.length === 1 ? "o" : "i"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-12 text-center">
          <p className="text-zinc-500">
            Nessun pagamento corrisponde ai filtri.
          </p>
        </div>
      ) : (
        <>
          {/* Tabella desktop */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500 bg-zinc-50">
                  <th className="px-5 py-3 font-medium">Partecipanti</th>
                  <th className="px-5 py-3 font-medium">Evento</th>
                  <th className="px-5 py-3 font-medium">Importo</th>
                  <th className="px-5 py-3 font-medium">Metodo</th>
                  <th className="px-5 py-3 font-medium">Data Pagamento</th>
                  <th className="px-5 py-3 font-medium">Registrato da</th>
                  <th className="px-5 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50"
                  >
                    <td className="px-5 py-3 font-medium text-zinc-800">
                      {participantSummary(payment.registration.participants)}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      {payment.registration.eventName}
                    </td>
                    <td className="px-5 py-3 text-zinc-800 font-medium">
                      €{payment.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          payment.paymentMethod === DISCOUNT_METHOD
                            ? "inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700"
                            : "text-zinc-600"
                        }
                      >
                        {paymentMethodLabels[payment.paymentMethod] ??
                          payment.paymentMethod}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-500">
                      {payment.paymentDate
                        ? new Date(payment.paymentDate).toLocaleDateString(
                            "it-IT"
                          )
                        : "-"}
                    </td>
                    <td className="px-5 py-3 text-zinc-500">
                      {payment.recordedByName}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 max-w-xs truncate">
                      {payment.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Schede mobile */}
          <div className="space-y-3 sm:hidden">
            {filtered.map((payment) => (
              <div
                key={payment.id}
                className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-800 truncate">
                      {participantSummary(payment.registration.participants)}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {payment.registration.eventName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-zinc-800">
                      €{payment.amount.toFixed(2)}
                    </p>
                    <span
                      className={`mt-0.5 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        payment.paymentMethod === DISCOUNT_METHOD
                          ? "bg-sky-50 text-sky-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {paymentMethodLabels[payment.paymentMethod] ??
                        payment.paymentMethod}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {payment.paymentDate
                      ? new Date(payment.paymentDate).toLocaleDateString(
                          "it-IT"
                        )
                      : "—"}
                  </span>
                  <span>{payment.recordedByName}</span>
                </div>
                {payment.notes && (
                  <p className="mt-2 text-xs text-zinc-500 italic border-t border-zinc-100 pt-2">
                    {payment.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
