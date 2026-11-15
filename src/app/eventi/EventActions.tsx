"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Event {
  id: string;
  name: string;
  year: number;
  startDate: string | Date;
  endDate: string | Date;
  location: string;
  active: boolean;
  registrations: unknown[];
}

export function EventActions({ event }: { event: Event }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function toggleActive() {
    setLoading("toggle");
    await fetch(`/api/eventi/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !event.active }),
    });
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Eliminare "${event.name}"? Questa azione è irreversibile.`))
      return;

    setLoading("delete");
    const res = await fetch(`/api/eventi/${event.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Errore durante l'eliminazione.");
    }

    router.refresh();
    setLoading(null);
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={toggleActive}
        disabled={loading === "toggle"}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
          event.active
            ? "border-amber-300 text-amber-700 hover:bg-amber-50"
            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        {loading === "toggle"
          ? "..."
          : event.active
          ? "Disattiva"
          : "Attiva"}
      </button>
      {event.registrations.length === 0 && (
        <button
          onClick={handleDelete}
          disabled={loading === "delete"}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {loading === "delete" ? "..." : "Elimina"}
        </button>
      )}
    </div>
  );
}
