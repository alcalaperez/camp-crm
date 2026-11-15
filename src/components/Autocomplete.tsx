"use client";

import { useId, useMemo, useRef, useState } from "react";

const MAX_RESULTS = 30;

/**
 * Campo con ricerca automatica (stile portale Alloggiati): dall'inserimento
 * dei primi due caratteri mostra l'elenco delle voci corrispondenti;
 * un clic con il tasto sinistro seleziona la voce e la riporta nella casella.
 */
export function Autocomplete({
  value,
  onChange,
  suggestions,
  placeholder,
  required,
  maxLength,
  className,
  inputClassName,
  emptyLabel = "Nessuna corrispondenza",
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
  /** Classi dell'input: se assente usa lo stile standard del form. */
  inputClassName?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();

  const baseInputClass =
    inputClassName ??
    "w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";

  // La ricerca parte dai primi due caratteri (requisito della scheda).
  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 2) return [];
    const starts: string[] = [];
    const contains: string[] = [];
    for (const s of suggestions) {
      const lower = s.toLowerCase();
      if (lower.startsWith(q)) starts.push(s);
      else if (lower.includes(q)) contains.push(s);
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [value, suggestions]);

  function select(s: string) {
    onChange(s);
    setOpen(false);
    setHighlight(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      // Seleziona la voce evidenziata senza inviare il form.
      e.preventDefault();
      select(matches[Math.min(highlight, matches.length - 1)]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        value={value}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Ritardo per lasciare passare il mousedown sulla voce dell'elenco.
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        className={baseInputClass}
        autoComplete="off"
      />
      {open && value.trim().length >= 2 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-zinc-300 rounded-lg shadow-lg text-sm"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-zinc-400 italic">{emptyLabel}</li>
          ) : (
            matches.map((m, i) => (
              <li
                key={m}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  // mousedown precede blur: seleziona senza chiudere prima.
                  e.preventDefault();
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  select(m);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`px-3 py-1.5 cursor-pointer ${
                  i === highlight
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {m}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
