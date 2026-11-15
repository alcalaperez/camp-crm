"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Editor del regolamento del camp, visibile e modificabile solo dagli ADMIN.
 * Mostra un'anteprima del testo corrente con un controllo di espansione per
 * modificarlo. Il salvataggio aggiorna solo il campo `rules` (PUT parziale).
 */
export function EventRulesEditor({
  eventId,
  initialRules,
}: {
  eventId: string;
  initialRules: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState(initialRules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/eventi/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Salvataggio fallito");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-xs text-emerald-700 hover:underline font-medium"
      >
        ✏️ Modifica regolamento
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="mt-2 space-y-2">
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">
        Regolamento del camp
      </label>
      <textarea
        value={rules}
        onChange={(e) => setRules(e.target.value)}
        rows={8}
        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        placeholder="Inserisci il testo del regolamento. Verrà mostrato nel modulo di iscrizione per l'accettazione obbligatoria."
      />
      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-xs disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salva regolamento"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRules(initialRules);
            setOpen(false);
            setError("");
          }}
          className="px-3 py-1.5 bg-white border border-zinc-300 text-zinc-700 font-medium rounded-lg hover:bg-zinc-50 transition-colors text-xs"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
