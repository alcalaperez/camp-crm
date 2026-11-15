"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/uploads-client";
import { Spinner, UploadProgress } from "@/components/UploadProgress";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — deve combaciare con src/lib/uploads.ts

export interface RegistrationDocument {
  idDocumentPath: string | null;
  idDocumentName: string | null;
  idDocumentMime: string | null;
  idDocumentSize: number | null;
  idDocumentUploadedAt: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentManager({
  participantId,
  document,
}: {
  participantId: string;
  document: RegistrationDocument | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const hasDoc = !!document?.idDocumentPath;
  const endpoint = `/api/partecipanti/${participantId}/documento`;

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Tipo di file non supportato (${file.type || "sconosciuto"}). Ammessi: JPG, PNG, WebP, PDF.`;
    }
    if (file.size <= 0) return "Il file è vuoto.";
    if (file.size > MAX_BYTES)
      return `File troppo grande (${formatBytes(file.size)}). Massimo ${formatBytes(MAX_BYTES)}.`;
    return null;
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Seleziona un file.");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setUploadFileName(file.name);
    setProgress(0);
    try {
      const res = await uploadFile(endpoint, file, setProgress);
      if (!res.ok) {
        setError(res.error ?? "Caricamento fallito.");
      } else {
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      }
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadFileName("");
    }
  }

  async function handleDelete() {
    if (!hasDoc) return;
    if (!window.confirm("Eliminare il documento caricato?")) return;

    setDeleting(true);
    setError("");
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Eliminazione fallita.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eliminazione fallita.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
        Documento d&apos;identità
      </h2>

      {hasDoc ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-zinc-50 rounded-lg px-3 py-2.5 text-sm">
            <div className="min-w-0">
              <span className="font-medium text-zinc-800">
                {document!.idDocumentName}
              </span>
              <span className="text-zinc-400 ml-2">
                {document!.idDocumentSize != null &&
                  formatBytes(document!.idDocumentSize)}
                {document!.idDocumentUploadedAt &&
                  ` · ${new Date(document!.idDocumentUploadedAt).toLocaleDateString("it-IT")}`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={endpoint}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 font-medium rounded-lg hover:bg-zinc-50 transition-colors text-sm"
            >
              👁️ Visualizza
            </a>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-white border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
            >
              {deleting ? "Eliminazione..." : "🗑️ Elimina"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-400 italic mb-3">
          Nessun documento caricato.
        </p>
      )}

      <form onSubmit={handleUpload} className="mt-3 space-y-3">
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            className="block w-full text-sm text-zinc-600
              file:mr-3 file:py-1.5 file:px-3
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-emerald-50 file:text-emerald-700
              hover:file:bg-emerald-100 file:cursor-pointer"
          />
          <p className="text-xs text-zinc-400 mt-1">
            JPG, PNG, WebP o PDF · massimo {formatBytes(MAX_BYTES)}
            {hasDoc && " · il nuovo file sostituirà quello attuale"}
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading && <Spinner className="h-4 w-4" />}
          {uploading
            ? `Caricamento ${progress}%`
            : hasDoc
              ? "Sostituisci documento"
              : "Carica documento"}
        </button>

        {uploading && (
          <UploadProgress
            fileName={uploadFileName}
            progress={progress}
          />
        )}
      </form>
    </div>
  );
}
