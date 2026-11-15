"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  calculateEventTotal,
  computeRegistrationBalance,
  formatEuro,
} from "@/lib/pricing";

// Tipi minimi dei dati serializzabili passati dal server component.
interface EventLike {
  id: string;
  name: string;
  priceAdult: number;
  priceKid1: number;
  priceKid2: number;
  priceKid3: number;
  priceKid4Plus: number;
}

interface ParticipantLike {
  role: string;
  firstName: string;
  lastName: string;
}

interface PaymentLike {
  paid: boolean;
  amount: number;
  paymentMethod: string;
}

export interface RegistrationRow {
  id: string;
  createdAt: string;
  status: string;
  city: string;
  sottoscrittoFirstName: string;
  sottoscrittoLastName: string;
  event: EventLike;
  participants: ParticipantLike[];
  payments: PaymentLike[];
}

function registrationAmounts(reg: RegistrationRow) {
  const adults = reg.participants.filter((p) => p.role === "ADULT").length;
  const total = calculateEventTotal(
    reg.event,
    adults,
    reg.participants.length - adults
  );
  const { balance } = computeRegistrationBalance(total, reg.payments);
  return { total, balance };
}

const selectClass =
  "w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white";

const inputClass =
  "w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";

/** Lista i nomi dei partecipanti con badge del ruolo (Adulto/Campista). */
function ParticipantNames({
  participants,
}: {
  participants: { role: string; firstName: string; lastName: string }[];
}) {
  if (participants.length === 0) return <span className="text-zinc-400">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {participants.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span
            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${
              p.role === "ADULT"
                ? "bg-sky-50 text-sky-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {p.role === "ADULT" ? "A" : "C"}
          </span>
          <span className="truncate">
            {p.firstName} {p.lastName}
          </span>
        </span>
      ))}
    </div>
  );
}

export function IscrizioniFilters({
  registrations,
  events,
}: {
  registrations: RegistrationRow[];
  events: { id: string; name: string }[];
}) {
  const [eventFilter, setEventFilter] = useState("ALL");
  const [payFilter, setPayFilter] = useState("ALL"); // ALL | PAID | UNPAID
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrations.filter((reg) => {
      if (eventFilter !== "ALL" && reg.event.id !== eventFilter) return false;

      const { balance } = registrationAmounts(reg);
      if (payFilter === "PAID" && balance > 0) return false;
      if (payFilter === "UNPAID" && balance <= 0) return false;

      if (q) {
        const names = [
          reg.sottoscrittoFirstName,
          reg.sottoscrittoLastName,
          ...reg.participants.flatMap((p) => [p.firstName, p.lastName]),
        ]
          .join(" ")
          .toLowerCase();
        if (!names.includes(q)) return false;
      }
      return true;
    });
  }, [registrations, eventFilter, payFilter, query]);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      CONFIRMED: {
        label: "Confermato",
        cls: "bg-emerald-50 text-emerald-700",
      },
      CANCELLED: { label: "Cancellato", cls: "bg-red-50 text-red-700" },
      PENDING: { label: "In attesa", cls: "bg-amber-50 text-amber-700" },
    };
    const s = map[status] ?? map.PENDING;
    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}
      >
        {s.label}
      </span>
    );
  };

  return (
    <div>
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
            <label className="block text-xs text-zinc-500 mb-1">
              Stato pagamento
            </label>
            <select
              value={payFilter}
              onChange={(e) => setPayFilter(e.target.value)}
              className={selectClass}
            >
              <option value="ALL">Tutti</option>
              <option value="PAID">Pagato</option>
              <option value="UNPAID">Non pagato</option>
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
            Nessuna iscrizione corrisponde ai filtri.
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
                  <th className="px-5 py-3 font-medium">Genitore/Tutore</th>
                  <th className="px-5 py-3 font-medium">Città</th>
                  <th className="px-5 py-3 font-medium">Evento</th>
                  <th className="px-5 py-3 font-medium">Stato</th>
                  <th className="px-5 py-3 font-medium">Importo</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg) => {
                  const { total, balance } = registrationAmounts(reg);
                  return (
                    <tr
                      key={reg.id}
                      className="border-b border-zinc-100 hover:bg-zinc-50"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/registrazioni/${reg.id}`}
                          className="text-emerald-700 hover:underline font-medium"
                        >
                          <ParticipantNames participants={reg.participants} />
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {reg.sottoscrittoFirstName} {reg.sottoscrittoLastName}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">{reg.city}</td>
                      <td className="px-5 py-3 text-zinc-600">
                        {reg.event.name}
                      </td>
                      <td className="px-5 py-3">{statusBadge(reg.status)}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-zinc-800">
                          {formatEuro(total)}
                        </div>
                        {balance > 0 ? (
                          <div className="text-amber-600 text-xs font-medium">
                            saldo {formatEuro(balance)}
                          </div>
                        ) : (
                          <div className="text-emerald-600 text-xs font-medium">
                            ✅ pagato
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-zinc-500">
                        {new Date(reg.createdAt).toLocaleDateString("it-IT")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Schede mobile */}
          <div className="space-y-3 sm:hidden">
            {filtered.map((reg) => {
              const { total, balance } = registrationAmounts(reg);
              return (
                <Link
                  key={reg.id}
                  href={`/registrazioni/${reg.id}`}
                  className="block bg-white rounded-xl border border-zinc-200 shadow-sm p-4 active:bg-zinc-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-emerald-700">
                        <ParticipantNames participants={reg.participants} />
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-1">
                        {reg.sottoscrittoFirstName} {reg.sottoscrittoLastName}
                      </p>
                    </div>
                    {statusBadge(reg.status)}
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="text-xs text-zinc-500">
                      <p className="truncate">{reg.event.name}</p>
                      <p>{reg.city}</p>
                      <p>
                        {new Date(reg.createdAt).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-zinc-800">
                        {formatEuro(total)}
                      </p>
                      {balance > 0 ? (
                        <p className="text-amber-600 text-xs font-medium">
                          saldo {formatEuro(balance)}
                        </p>
                      ) : (
                        <p className="text-emerald-600 text-xs font-medium">
                          ✅ pagato
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
