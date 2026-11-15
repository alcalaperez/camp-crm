"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEuro } from "@/lib/pricing";
import {
  computeCampBalance,
  expenseCategoryLabels,
  incomeSourceLabels,
} from "@/lib/bilancio";
import { ExpenseFormModal, IncomeFormModal } from "./BilancioForms";

export interface ExpenseRow {
  id: string;
  eventId: string;
  eventName: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes: string;
}

export interface IncomeRow {
  id: string;
  eventId: string;
  eventName: string;
  title: string;
  source: string;
  amount: number;
  date: string;
  notes: string;
}

export interface RegistrationRow {
  id: string;
  eventId: string;
  eventName: string;
  participantsSummary: string;
  sottoscritto: string;
  status: string;
  quotaTotal: number;
  paid: number;
  discount: number;
  due: number;
}

const selectClass =
  "px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white";

const statusLabels: Record<string, string> = {
  PENDING: "In attesa",
  CONFIRMED: "Confermata",
  CANCELLED: "Annullata",
};

function statusBadge(status: string) {
  const cls =
    status === "CONFIRMED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "CANCELLED"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT");
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-zinc-300 hover:text-rose-600 transition-colors text-sm"
      title="Elimina"
      aria-label="Elimina"
    >
      ✕
    </button>
  );
}

export function BilancioView({
  events,
  expenses,
  incomes,
  registrations,
}: {
  events: { id: string; name: string }[];
  expenses: ExpenseRow[];
  incomes: IncomeRow[];
  registrations: RegistrationRow[];
}) {
  const router = useRouter();
  const [eventFilter, setEventFilter] = useState("ALL");
  const [modal, setModal] = useState<"expense" | "income" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredExpenses = useMemo(
    () =>
      eventFilter === "ALL"
        ? expenses
        : expenses.filter((e) => e.eventId === eventFilter),
    [expenses, eventFilter]
  );
  const filteredIncomes = useMemo(
    () =>
      eventFilter === "ALL"
        ? incomes
        : incomes.filter((i) => i.eventId === eventFilter),
    [incomes, eventFilter]
  );
  const filteredRegistrations = useMemo(
    () =>
      eventFilter === "ALL"
        ? registrations
        : registrations.filter((r) => r.eventId === eventFilter),
    [registrations, eventFilter]
  );

  const stats = useMemo(
    () => computeCampBalance(filteredRegistrations, filteredExpenses, filteredIncomes),
    [filteredRegistrations, filteredExpenses, filteredIncomes]
  );

  // Somma dei "dovuto" delle iscrizioni attive (per il totale di colonna).
  const activeRegistrations = filteredRegistrations.filter(
    (r) => r.status !== "CANCELLED"
  );
  const totalsRow = activeRegistrations.reduce(
    (acc, r) => ({
      quotaTotal: acc.quotaTotal + r.quotaTotal,
      paid: acc.paid + r.paid,
      discount: acc.discount + r.discount,
      due: acc.due + r.due,
    }),
    { quotaTotal: 0, paid: 0, discount: 0, due: 0 }
  );

  async function handleDelete(
    url: string,
    id: string,
    message: string
  ) {
    if (!window.confirm(message)) return;
    setDeletingId(id);
    const res = await fetch(`${url}/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) router.refresh();
  }

  return (
    <div>
      {/* Barra azioni: filtro evento + pulsanti */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
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
        <div className="flex gap-2 sm:items-end">
          <button
            onClick={() => setModal("expense")}
            className="px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors text-sm"
          >
            + Nuova Spesa
          </button>
          <button
            onClick={() => setModal("income")}
            className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            + Nuova Entrata
          </button>
        </div>
      </div>

      {/* Riepilogo (riflette il filtro evento) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Quote incassate</p>
          <p className="text-2xl font-bold text-emerald-700">
            {formatEuro(stats.participantIncome)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Pagamenti ricevuti dai partecipanti
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Altre entrate</p>
          <p className="text-2xl font-bold text-sky-700">
            {formatEuro(stats.otherIncome)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Donazioni, contributi, rimborsi…
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Totale uscite</p>
          <p className="text-2xl font-bold text-rose-700">
            {formatEuro(stats.totalExpenses)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">Spese registrate</p>
        </div>
        <div
          className={`rounded-xl p-5 shadow-sm ${
            stats.balance >= 0
              ? "bg-emerald-600 border border-emerald-600"
              : "bg-rose-600 border border-rose-600"
          }`}
        >
          <p
            className={`text-sm mb-1 ${stats.balance >= 0 ? "text-emerald-50" : "text-rose-50"}`}
          >
            Bilancio del camp
          </p>
          <p className="text-3xl font-bold text-white">
            {stats.balance >= 0 ? "+" : ""}
            {formatEuro(stats.balance)}
          </p>
          <p
            className={`text-xs mt-1 ${stats.balance >= 0 ? "text-emerald-100" : "text-rose-100"}`}
          >
            Entrate ({formatEuro(stats.totalIncome)}) − uscite
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Quote attese</p>
          <p className="text-2xl font-bold text-zinc-800">
            {formatEuro(stats.expectedIncome)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Iscrizioni attive, sconti esclusi ({formatEuro(stats.totalDiscount)})
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Ancora da incassare</p>
          <p className="text-2xl font-bold text-amber-700">
            {formatEuro(stats.outstanding)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Saldo dovuto dai partecipanti
          </p>
        </div>
      </div>

      {/* Spese */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-zinc-900">💰 Spese</h2>
          <span className="text-sm font-semibold text-rose-700">
            {formatEuro(stats.totalExpenses)}
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-8 text-center">
            <p className="text-zinc-500 text-sm">
              Nessuna spesa registrata. Usa «+ Nuova Spesa» per aggiungere una
              bolletta o un costo del camp.
            </p>
          </div>
        ) : (
          <>
            {/* Tabella desktop */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500 bg-zinc-50">
                    <th className="px-5 py-3 font-medium">Titolo</th>
                    <th className="px-5 py-3 font-medium">Categoria</th>
                    {eventFilter === "ALL" && (
                      <th className="px-5 py-3 font-medium">Evento</th>
                    )}
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">Importo</th>
                    <th className="px-5 py-3 font-medium">Note</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e) => (
                    <tr
                      key={e.id}
                      className={`border-b border-zinc-100 hover:bg-zinc-50 ${deletingId === e.id ? "opacity-50" : ""}`}
                    >
                      <td className="px-5 py-3 font-medium text-zinc-800">
                        {e.title}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
                          {expenseCategoryLabels[e.category] ?? e.category}
                        </span>
                      </td>
                      {eventFilter === "ALL" && (
                        <td className="px-5 py-3 text-zinc-600">{e.eventName}</td>
                      )}
                      <td className="px-5 py-3 text-zinc-500">
                        {formatDate(e.date)}
                      </td>
                      <td className="px-5 py-3 font-medium text-rose-700">
                        −{formatEuro(e.amount)}
                      </td>
                      <td className="px-5 py-3 text-zinc-500 max-w-xs truncate">
                        {e.notes || "-"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <DeleteButton
                          onClick={() =>
                            handleDelete(
                              "/api/spese",
                              e.id,
                              `Eliminare la spesa «${e.title}»?`
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Schede mobile */}
            <div className="space-y-3 sm:hidden">
              {filteredExpenses.map((e) => (
                <div
                  key={e.id}
                  className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-800 break-words">
                        {e.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(e.date)} · {e.eventName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-rose-700">
                        −{formatEuro(e.amount)}
                      </p>
                      <span className="mt-0.5 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
                        {expenseCategoryLabels[e.category] ?? e.category}
                      </span>
                    </div>
                  </div>
                  {e.notes && (
                    <p className="mt-2 text-xs text-zinc-500 italic border-t border-zinc-100 pt-2">
                      {e.notes}
                    </p>
                  )}
                  <div className="mt-2 text-right">
                    <DeleteButton
                      onClick={() =>
                        handleDelete(
                          "/api/spese",
                          e.id,
                          `Eliminare la spesa «${e.title}»?`
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Entrate extra */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-zinc-900">🎁 Altre entrate</h2>
          <span className="text-sm font-semibold text-sky-700">
            {formatEuro(stats.otherIncome)}
          </span>
        </div>

        {filteredIncomes.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-8 text-center">
            <p className="text-zinc-500 text-sm">
              Nessuna entrata extra. Usa «+ Nuova Entrata» per registrare
              donazioni, contributi o rimborsi.
            </p>
          </div>
        ) : (
          <>
            {/* Tabella desktop */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500 bg-zinc-50">
                    <th className="px-5 py-3 font-medium">Titolo</th>
                    <th className="px-5 py-3 font-medium">Origine</th>
                    {eventFilter === "ALL" && (
                      <th className="px-5 py-3 font-medium">Evento</th>
                    )}
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">Importo</th>
                    <th className="px-5 py-3 font-medium">Note</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredIncomes.map((i) => (
                    <tr
                      key={i.id}
                      className={`border-b border-zinc-100 hover:bg-zinc-50 ${deletingId === i.id ? "opacity-50" : ""}`}
                    >
                      <td className="px-5 py-3 font-medium text-zinc-800">
                        {i.title}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">
                          {incomeSourceLabels[i.source] ?? i.source}
                        </span>
                      </td>
                      {eventFilter === "ALL" && (
                        <td className="px-5 py-3 text-zinc-600">{i.eventName}</td>
                      )}
                      <td className="px-5 py-3 text-zinc-500">
                        {formatDate(i.date)}
                      </td>
                      <td className="px-5 py-3 font-medium text-emerald-700">
                        +{formatEuro(i.amount)}
                      </td>
                      <td className="px-5 py-3 text-zinc-500 max-w-xs truncate">
                        {i.notes || "-"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <DeleteButton
                          onClick={() =>
                            handleDelete(
                              "/api/entrate",
                              i.id,
                              `Eliminare l'entrata «${i.title}»?`
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Schede mobile */}
            <div className="space-y-3 sm:hidden">
              {filteredIncomes.map((i) => (
                <div
                  key={i.id}
                  className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-800 break-words">
                        {i.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(i.date)} · {i.eventName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-emerald-700">
                        +{formatEuro(i.amount)}
                      </p>
                      <span className="mt-0.5 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">
                        {incomeSourceLabels[i.source] ?? i.source}
                      </span>
                    </div>
                  </div>
                  {i.notes && (
                    <p className="mt-2 text-xs text-zinc-500 italic border-t border-zinc-100 pt-2">
                      {i.notes}
                    </p>
                  )}
                  <div className="mt-2 text-right">
                    <DeleteButton
                      onClick={() =>
                        handleDelete(
                          "/api/entrate",
                          i.id,
                          `Eliminare l'entrata «${i.title}»?`
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Quote partecipanti */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-1">
          👥 Quote partecipanti
        </h2>
        <p className="text-xs text-zinc-400 mb-3">
          Entrate per iscrizione: quota calcolata dai prezzi dell&apos;evento,
          denaro già ricevuto e saldo dovuto. Le iscrizioni annullate sono
          escluse dal bilancio.
        </p>

        {filteredRegistrations.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-8 text-center">
            <p className="text-zinc-500 text-sm">
              Nessuna iscrizione per questo evento.
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
                    <th className="px-5 py-3 font-medium">Sottoscritto</th>
                    {eventFilter === "ALL" && (
                      <th className="px-5 py-3 font-medium">Evento</th>
                    )}
                    <th className="px-5 py-3 font-medium">Stato</th>
                    <th className="px-5 py-3 font-medium text-right">Quota</th>
                    <th className="px-5 py-3 font-medium text-right">Pagato</th>
                    <th className="px-5 py-3 font-medium text-right">Sconto</th>
                    <th className="px-5 py-3 font-medium text-right">Dovuto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b border-zinc-100 hover:bg-zinc-50 ${r.status === "CANCELLED" ? "opacity-50" : ""}`}
                    >
                      <td className="px-5 py-3 font-medium text-zinc-800">
                        {r.participantsSummary}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">{r.sottoscritto}</td>
                      {eventFilter === "ALL" && (
                        <td className="px-5 py-3 text-zinc-600">{r.eventName}</td>
                      )}
                      <td className="px-5 py-3">{statusBadge(r.status)}</td>
                      <td className="px-5 py-3 text-right text-zinc-800">
                        {formatEuro(r.quotaTotal)}
                      </td>
                      <td className="px-5 py-3 text-right text-emerald-700">
                        {formatEuro(r.paid)}
                      </td>
                      <td className="px-5 py-3 text-right text-sky-700">
                        {r.discount > 0 ? `−${formatEuro(r.discount)}` : "-"}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-medium ${r.due > 0 ? "text-amber-700" : "text-emerald-700"}`}
                      >
                        {formatEuro(r.due)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-semibold text-zinc-800">
                    <td className="px-5 py-3" colSpan={eventFilter === "ALL" ? 4 : 3}>
                      Totale iscrizioni attive ({activeRegistrations.length})
                    </td>
                    <td className="px-5 py-3 text-right">
                      {formatEuro(totalsRow.quotaTotal)}
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-700">
                      {formatEuro(totalsRow.paid)}
                    </td>
                    <td className="px-5 py-3 text-right text-sky-700">
                      {formatEuro(totalsRow.discount)}
                    </td>
                    <td className="px-5 py-3 text-right text-amber-700">
                      {formatEuro(totalsRow.due)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Schede mobile */}
            <div className="space-y-3 sm:hidden">
              {filteredRegistrations.map((r) => (
                <div
                  key={r.id}
                  className={`bg-white rounded-xl border border-zinc-200 shadow-sm p-4 ${r.status === "CANCELLED" ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-800 break-words">
                        {r.participantsSummary}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {r.sottoscritto} · {r.eventName}
                      </p>
                    </div>
                    {statusBadge(r.status)}
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center border-t border-zinc-100 pt-3">
                    <div>
                      <p className="text-xs text-zinc-400">Quota</p>
                      <p className="text-sm font-medium text-zinc-800">
                        {formatEuro(r.quotaTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Pagato</p>
                      <p className="text-sm font-medium text-emerald-700">
                        {formatEuro(r.paid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Sconto</p>
                      <p className="text-sm font-medium text-sky-700">
                        {formatEuro(r.discount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Dovuto</p>
                      <p
                        className={`text-sm font-medium ${r.due > 0 ? "text-amber-700" : "text-emerald-700"}`}
                      >
                        {formatEuro(r.due)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Modali */}
      {modal === "expense" && (
        <ExpenseFormModal
          events={events}
          defaultEventId={eventFilter !== "ALL" ? eventFilter : undefined}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "income" && (
        <IncomeFormModal
          events={events}
          defaultEventId={eventFilter !== "ALL" ? eventFilter : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
