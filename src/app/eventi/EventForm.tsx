"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EventForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const year = parseInt(
      (form.elements.namedItem("year") as HTMLInputElement).value
    );
    const startDate = (
      form.elements.namedItem("startDate") as HTMLInputElement
    ).value;
    const endDate = (form.elements.namedItem("endDate") as HTMLInputElement)
      .value;
    const location = (
      form.elements.namedItem("location") as HTMLInputElement
    ).value;

    const parsePrice = (n: string) => {
      const v = parseFloat(n);
      return Number.isFinite(v) && v >= 0 ? v : 0;
    };
    const priceAdult = parsePrice(
      (form.elements.namedItem("priceAdult") as HTMLInputElement).value
    );
    const priceKid1 = parsePrice(
      (form.elements.namedItem("priceKid1") as HTMLInputElement).value
    );
    const priceKid2 = parsePrice(
      (form.elements.namedItem("priceKid2") as HTMLInputElement).value
    );
    const priceKid3 = parsePrice(
      (form.elements.namedItem("priceKid3") as HTMLInputElement).value
    );
    const priceKid4Plus = parsePrice(
      (form.elements.namedItem("priceKid4Plus") as HTMLInputElement).value
    );

    // Limite partecipanti: vuoto = illimitato (null).
    const limitRaw = (
      form.elements.namedItem("participantLimit") as HTMLInputElement
    ).value.trim();
    const limitN = Number(limitRaw);
    const participantLimit =
      limitRaw !== "" && Number.isFinite(limitN) && limitN >= 0
        ? Math.trunc(limitN)
        : null;

    const res = await fetch("/api/eventi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        year,
        startDate,
        endDate,
        location,
        priceAdult,
        priceKid1,
        priceKid2,
        priceKid3,
        priceKid4Plus,
        participantLimit,
      }),
    });

    if (!res.ok) {
      setError("Errore durante la creazione dell'evento.");
      setLoading(false);
      return;
    }

    form.reset();
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Nome Evento *
          </label>
          <input
            name="name"
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Camp Estivo 2026"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Anno *
          </label>
          <input
            name="year"
            type="number"
            required
            defaultValue={new Date().getFullYear()}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Luogo
          </label>
          <input
            name="location"
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Centro Estivo, Via..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Data Inizio *
          </label>
          <input
            name="startDate"
            type="date"
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Data Fine *
          </label>
          <input
            name="endDate"
            type="date"
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-1">
            Numero massimo partecipanti
          </label>
          <input
            name="participantLimit"
            type="number"
            min="0"
            step="1"
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="illimitato"
          />
          <p className="text-xs text-zinc-400 mt-1">
            Adulti + campisti sommati su tutte le iscrizioni. Vuoto = illimitato.
          </p>
        </div>
      </div>

      {/* Quote */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-1">Quote (€)</h3>
        <p className="text-xs text-zinc-400 mb-3">
          Prezzo per partecipante. Sconto a scalare sui campisti in base
          all&apos;ordine: il 4° e successivi pagano la quota &quot;Dal 4°&quot;
          (0 = gratuito).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">
              Adulto *
            </label>
            <input
              name="priceAdult"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={0}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="150"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">
              1° Campista *
            </label>
            <input
              name="priceKid1"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={0}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="190"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">
              2° Campista *
            </label>
            <input
              name="priceKid2"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={0}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="150"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">
              3° Campista *
            </label>
            <input
              name="priceKid3"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={0}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">
              Dal 4° Campista *
            </label>
            <input
              name="priceKid4Plus"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={0}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crea Evento"}
      </button>
    </form>
  );
}
