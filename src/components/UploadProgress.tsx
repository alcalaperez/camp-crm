/**
 * Indicatore di avanzamento per l'upload di un documento.
 *
 * Mostra uno spinner, il nome del file e una barra di progressione.
 * Da usare mentre è in corso un caricamento gestito da
 * `uploadFile` (src/lib/uploads-client.ts).
 */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function UploadProgress({
  fileName,
  progress,
  label,
}: {
  fileName?: string;
  progress: number;
  label?: string;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Spinner className="h-3.5 w-3.5 text-emerald-600" />
        <span className="truncate">
          {fileName ? `${fileName} · ` : ""}
          {label ?? "Caricamento in corso…"} {progress}%
        </span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-emerald-100 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
