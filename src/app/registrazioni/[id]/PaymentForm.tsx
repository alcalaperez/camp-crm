"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DISCOUNT_METHOD } from "@/lib/pricing";

export function PaymentForm({ registrationId }: { registrationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState("CONTANTI");

  const isDiscount = method === DISCOUNT_METHOD;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const amount = parseFloat(
      (form.elements.namedItem("amount") as HTMLInputElement).value
    );
    const paymentMethod = (
      form.elements.namedItem("paymentMethod") as HTMLSelectElement
    ).value;
    const paymentDate = (
      form.elements.namedItem("paymentDate") as HTMLInputElement
    ).value;
    const notes = (
      form.elements.namedItem("notes") as HTMLInputElement
    ).value;

    const res = await fetch("/api/pagamenti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registrationId,
        amount,
        // I pagamenti sono sempre considerati pagati.
        paid: true,
        paymentMethod,
        paymentDate: paymentDate || null,
        notes: notes ?? "",
      }),
    });

    if (!res.ok) {
      setError("Errore durante il salvataggio del pagamento.");
      setLoading(false);
      return;
    }

    form.reset();
    setMethod("CONTANTI");
    router.refresh();
    setLoading(false);
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
        Registra Pagamento
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              {isDiscount ? "Sconto (€)" : "Importo (€)"}
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Metodo</label>
            <select
              name="paymentMethod"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              <option value="CONTANTI">Contanti</option>
              <option value="BONIFICO">Bonifico</option>
              <option value="CARTA">Carta</option>
              <option value={DISCOUNT_METHOD}>Sconto</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Data</label>
            <input
              name="paymentDate"
              type="date"
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {isDiscount && (
          <p className="text-xs text-sky-700 bg-sky-50 px-3 py-1.5 rounded">
            Lo sconto riduce il saldo dovuto ma non conta come denaro ricevuto.
          </p>
        )}

        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            Note / Commenti
          </label>
          <input
            name="notes"
            type="text"
            className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder={
              isDiscount
                ? "Es. sconto famiglia numerosa, borsa di studio…"
                : "Es. acconto, pagamento unico per più fratelli…"
            }
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
        >
          {loading
            ? "Salvando..."
            : isDiscount
            ? "Applica Sconto"
            : "Registra Pagamento"}
        </button>
      </form>
    </div>
  );
}
