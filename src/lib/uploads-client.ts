/**
 * Helper lato client per caricare un file con avanzamento reale.
 *
 * `fetch` non supporta l'advance dell'upload, quindi usiamo XMLHttpRequest
 * e il suo evento `upload.onprogress`.
 */

export interface UploadResult {
  ok: boolean;
  /** Messaggio di errore lato server, se `ok` è false. */
  error?: string;
}

/**
 * Carica un file su `endpoint` via XHR.
 *
 * @param onProgress chiamato con la percentuale (0-100) man mano che i byte
 *   vengono inviati. Non viene chiamato se il browser non riesce a calcolare
 *   l'avanzamento (raro: `lengthComputable` false).
 */
export function uploadFile(
  endpoint: string,
  file: File,
  onProgress: (percent: number) => void,
  options?: {
    fieldName?: string;
    headers?: Record<string, string>;
  },
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append(options?.fieldName ?? "file", file);

    xhr.open("POST", endpoint);
    xhr.responseType = "json";

    // Header custom, es. X-Upload-Token per il form pubblico.
    for (const [key, value] of Object.entries(options?.headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true });
      } else {
        const message =
          (xhr.response as { error?: string } | null)?.error ||
          "Caricamento fallito.";
        resolve({ ok: false, error: message });
      }
    };

    xhr.onerror = () =>
      resolve({ ok: false, error: "Errore di rete durante il caricamento." });

    xhr.send(formData);
  });
}
