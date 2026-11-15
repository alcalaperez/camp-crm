"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EXPENSE_CATEGORIES,
  INCOME_SOURCES,
  expenseCategoryLabels,
  incomeSourceLabels,
} from "@/lib/bilancio";

const inputClass =
  "w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";

const todayISO = () => new Date().toISOString().slice(0, 10);

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 transition-colors"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EventSelect({
  events,
  defaultValue,
}: {
  events: { id: string; name: string }[];
  defaultValue?: string;
}) {
  return (
    <select name="eventId" required defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="" disabled>
        Seleziona un evento…
      </option>
      {events.map((ev) => (
        <option key={ev.id} value={ev.id}>
          {ev.name}
        </option>
      ))}
    </select>
  );
}

export function ExpenseFormModal({
  events,
  defaultEventId,
  onClose,
}: {
  events: { id: string; name: string }[];
  defaultEventId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    const res = await fetch("/api/spese", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: fd.get("eventId"),
        title: fd.get("title"),
        category: fd.get("category"),
        amount: parseFloat(fd.get("amount") as string),
        date: fd.get("date") || null,
        notes: fd.get("notes") || "",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Errore durante la creazione della spesa.");
      setLoading(false);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <ModalShell title="Nuova Spesa" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Evento *
          </label>
          <EventSelect events={events} defaultValue={defaultEventId} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Titolo *
          </label>
          <input
            name="title"
            required
            className={inputClass}
            placeholder="es. Spesa alimentare, pullman, affitto struttura…"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">
              Categoria
            </label>
            <select name="category" defaultValue="GENERALE" className={inputClass}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {expenseCategoryLabels[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">
              Importo (€) *
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              className={inputClass}
              placeholder="150,00"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Data
          </label>
          <input
            name="date"
            type="date"
            defaultValue={todayISO()}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Note
          </label>
          <textarea
            name="notes"
            rows={2}
            className={inputClass}
            placeholder="Dettagli opzionali…"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors text-sm disabled:opacity-50"
          >
            {loading ? "Salvataggio…" : "Aggiungi Spesa"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function IncomeFormModal({
  events,
  defaultEventId,
  onClose,
}: {
  events: { id: string; name: string }[];
  defaultEventId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    const res = await fetch("/api/entrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: fd.get("eventId"),
        title: fd.get("title"),
        source: fd.get("source"),
        amount: parseFloat(fd.get("amount") as string),
        date: fd.get("date") || null,
        notes: fd.get("notes") || "",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Errore durante la creazione dell'entrata.");
      setLoading(false);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <ModalShell title="Nuova Entrata" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Evento *
          </label>
          <EventSelect events={events} defaultValue={defaultEventId} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Titolo *
          </label>
          <input
            name="title"
            required
            className={inputClass}
            placeholder="es. Donazione parrocchia, contributo associazione…"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">
              Origine
            </label>
            <select name="source" defaultValue="ALTRO" className={inputClass}>
              {INCOME_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {incomeSourceLabels[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">
              Importo (€) *
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              className={inputClass}
              placeholder="200,00"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Data
          </label>
          <input
            name="date"
            type="date"
            defaultValue={todayISO()}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Note
          </label>
          <textarea
            name="notes"
            rows={2}
            className={inputClass}
            placeholder="Dettagli opzionali…"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
          >
            {loading ? "Salvataggio…" : "Aggiungi Entrata"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
