"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "PENDING", label: "In attesa", color: "amber" },
  { value: "CONFIRMED", label: "Confermato", color: "emerald" },
  { value: "CANCELLED", label: "Cancellato", color: "red" },
] as const;

export function StatusForm({
  registrationId,
  currentStatus,
}: {
  registrationId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [_, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(value: string) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/registrazioni/${registrationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (!res.ok) {
        throw new Error("Aggiornamento fallito");
      }
      startTransition(router.refresh);
    } catch {
      setError("Impossibile aggiornare lo stato.");
    } finally {
      setSaving(false);
    }
  }

  const active = STATUSES.find((s) => s.value === currentStatus) ?? STATUSES[0];

  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">Stato iscrizione</label>
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const isActive = s.value === active.value;
          const colorClasses: Record<string, string> = {
            amber: "bg-amber-600 border-amber-600",
            emerald: "bg-emerald-600 border-emerald-600",
            red: "bg-red-600 border-red-600",
          };
          const idleClasses: Record<string, string> = {
            amber: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
            emerald:
              "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
            red: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
          };
          return (
            <button
              key={s.value}
              type="button"
              disabled={saving}
              onClick={() => handleChange(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                isActive
                  ? `${colorClasses[s.color]} text-white`
                  : idleClasses[s.color]
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1.5">{error}</p>
      )}
    </div>
  );
}
