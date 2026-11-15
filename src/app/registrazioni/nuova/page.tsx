"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatEuro } from "@/lib/pricing";
import { uploadFile } from "@/lib/uploads-client";
import { Spinner, UploadProgress } from "@/components/UploadProgress";
import { Autocomplete } from "@/components/Autocomplete";
import comuni from "@/data/comuni.json";
import { STATI, STATI_ESTERI } from "@/data/stati";

// Luogo di nascita: comuni italiani + Stati esteri (per nati all'estero),
// come da scheda alloggiati.
const LUOGHI_NASCITA = [...comuni, ...STATI_ESTERI];

interface Event {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  location: string;
  priceAdult: number;
  priceKid1: number;
  priceKid2: number;
  priceKid3: number;
  priceKid4Plus: number;
  rules: string;
  participantLimit: number | null;
}

interface Availability {
  limit: number | null;
  taken: number;
  remaining: number | null;
}

interface KidRow {
  firstName: string;
  lastName: string;
  birthDate: string;
  taxId: string;
  nationality: string;
  birthPlace: string;
  sex: string; // "" | "M" | "F"
  notes: string;
}

// Cittadinanza precompilata: il caso più comune. Modificabile per stranieri.
const DEFAULT_NATIONALITY = "ITALIA";

const emptyKid: KidRow = {
  firstName: "",
  lastName: "",
  birthDate: "",
  taxId: "",
  nationality: DEFAULT_NATIONALITY,
  birthPlace: "",
  sex: "",
  notes: "",
};

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — deve combaciare con src/lib/uploads.ts

function validateDocument(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `Tipo di file non supportato. Ammessi: JPG, PNG, WebP, PDF.`;
  }
  if (file.size > MAX_BYTES) return `File troppo grande. Massimo 10 MB.`;
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NuovaIscrizionePage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Avanzamento dell'upload dei documenti (fase successiva alla creazione
  // dell'iscrizione). Mostrato nel bottone di submit.
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Se true, il sottoscritto partecipa al camp come ADULT: serve la data di nascita
  // e il codice fiscale (solo in questo caso, l'adulto è un partecipante).
  const [adultAttending, setAdultAttending] = useState(false);
  const [adultBirthDate, setAdultBirthDate] = useState("");
  const [adultTaxId, setAdultTaxId] = useState("");
  const [adultNationality, setAdultNationality] = useState(DEFAULT_NATIONALITY);
  const [adultBirthPlace, setAdultBirthPlace] = useState("");
  const [adultSex, setAdultSex] = useState("");
  const [adultNotes, setAdultNotes] = useState("");
  const [kids, setKids] = useState<KidRow[]>([]);

  // Documenti d'identità (uno per partecipante). Vengono caricati dopo aver
  // creato l'iscrizione, perché il route dei documenti è per-partecipante
  // (serve l'id del partecipante, che esiste solo dopo la creazione).
  const [adultFile, setAdultFile] = useState<File | null>(null);
  // Allineato a `kids`. Se i due array si desincronizzano, setKidFile reimposta
  // comunque l'indice corretto (vedi sotto).
  const [kidFiles, setKidFiles] = useState<(File | null)[]>([]);

  // Consensi obbligatori.
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [rulesConsent, setRulesConsent] = useState(false);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // Disponibilità posti dell'evento selezionato (solo se ha un limite).
  const [availability, setAvailability] = useState<Availability | null>(null);

  useEffect(() => {
    fetch("/api/eventi")
      .then((r) => r.json())
      .then(setEvents);
  }, []);

  useEffect(() => {
    if (!selectedEventId || selectedEvent?.participantLimit === null) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/eventi/${selectedEventId}/posti`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setAvailability(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedEventId, selectedEvent?.participantLimit]);

  function updateKid(index: number, field: keyof KidRow, value: string) {
    setKids((prev) =>
      prev.map((k, i) => (i === index ? { ...k, [field]: value } : k)),
    );
  }

  function addKid() {
    setKids((prev) => [...prev, { ...emptyKid }]);
    setKidFiles((prev) => [...prev, null]);
  }

  function removeKid(index: number) {
    setKids((prev) => prev.filter((_, i) => i !== index));
    setKidFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function setKidFile(index: number, file: File | null) {
    setKidFiles((prev) => {
      // Garantisci che l'array sia abbastanza lungo: se per qualche motivo
      // kidFiles è più corto di kids, riempi i buchi con null prima di
      // assegnare l'indice. Evita di perdere silenziosamente il file.
      const next = [...prev];
      while (next.length <= index) next.push(null);
      next[index] = file;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;

    const subscriber = {
      eventId: (form.elements.namedItem("eventId") as HTMLSelectElement).value,
      sottoscrittoFirstName: (
        form.elements.namedItem("sottoscrittoFirstName") as HTMLInputElement
      ).value,
      sottoscrittoLastName: (
        form.elements.namedItem("sottoscrittoLastName") as HTMLInputElement
      ).value,
      sottoscrittoPhone: (
        form.elements.namedItem("sottoscrittoPhone") as HTMLInputElement
      ).value,
      sottoscrittoEmail: (
        form.elements.namedItem("sottoscrittoEmail") as HTMLInputElement
      ).value,
      street: (form.elements.namedItem("street") as HTMLInputElement).value,
      postalCode: (form.elements.namedItem("postalCode") as HTMLInputElement)
        .value,
      city: (form.elements.namedItem("city") as HTMLInputElement).value,
    };

    if (!subscriber.eventId) {
      setError("Seleziona un evento.");
      setLoading(false);
      return;
    }

    // Costruisce la lista partecipanti. Mantiene anche il file associato
    // (se presente) per poterne fare l'upload dopo la creazione.
    const participants: {
      role: string;
      firstName: string;
      lastName: string;
      birthDate: string;
      taxId?: string;
      nationality?: string;
      birthPlace?: string;
      sex?: string;
      notes?: string;
      file?: File | null;
    }[] = [];

    if (adultAttending) {
      if (!adultBirthDate) {
        setError("Inserisci la data di nascita del partecipante adulto.");
        setLoading(false);
        return;
      }
      if (!adultTaxId.trim()) {
        setError("Inserisci il codice fiscale del partecipante adulto.");
        setLoading(false);
        return;
      }
      if (!adultNationality.trim()) {
        setError("Inserisci la cittadinanza del partecipante adulto.");
        setLoading(false);
        return;
      }
      if (!adultBirthPlace.trim()) {
        setError("Inserisci il luogo di nascita del partecipante adulto.");
        setLoading(false);
        return;
      }
      if (adultSex !== "M" && adultSex !== "F") {
        setError("Seleziona il sesso del partecipante adulto.");
        setLoading(false);
        return;
      }
      if (!adultFile) {
        setError("Carica il documento d'identità del partecipante adulto.");
        setLoading(false);
        return;
      }
      participants.push({
        role: "ADULT",
        firstName: subscriber.sottoscrittoFirstName,
        lastName: subscriber.sottoscrittoLastName,
        birthDate: adultBirthDate,
        taxId: adultTaxId.trim().toUpperCase(),
        nationality: adultNationality.trim(),
        birthPlace: adultBirthPlace.trim(),
        sex: adultSex,
        notes: adultNotes.trim(),
        file: adultFile,
      });
    }

    // Valida i file selezionati (lato client) prima di inviare.
    if (adultFile) {
      const v = validateDocument(adultFile);
      if (v) {
        setError(`Documento adulto: ${v}`);
        setLoading(false);
        return;
      }
    }

    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i];
      if (!kid.firstName.trim() || !kid.lastName.trim() || !kid.birthDate) {
        setError(`Completa tutti i campi obbligatori del campista ${i + 1}.`);
        setLoading(false);
        return;
      }
      // Il codice fiscale serve per ogni campista, anche se iscritto dai genitori.
      if (!kid.taxId.trim()) {
        setError(`Inserisci il codice fiscale del campista ${i + 1}.`);
        setLoading(false);
        return;
      }
      if (!kid.nationality.trim()) {
        setError(`Inserisci la cittadinanza del campista ${i + 1}.`);
        setLoading(false);
        return;
      }
      if (!kid.birthPlace.trim()) {
        setError(`Inserisci il luogo di nascita del campista ${i + 1}.`);
        setLoading(false);
        return;
      }
      if (kid.sex !== "M" && kid.sex !== "F") {
        setError(`Seleziona il sesso del campista ${i + 1}.`);
        setLoading(false);
        return;
      }
      const file = kidFiles[i] ?? null;
      if (!file) {
        setError(`Carica il documento d'identità del campista ${i + 1}.`);
        setLoading(false);
        return;
      }
      const v = validateDocument(file);
      if (v) {
        setError(`Campista ${i + 1}: ${v}`);
        setLoading(false);
        return;
      }
      participants.push({
        role: "KID",
        firstName: kid.firstName,
        lastName: kid.lastName,
        birthDate: kid.birthDate,
        taxId: kid.taxId.trim().toUpperCase(),
        nationality: kid.nationality.trim(),
        birthPlace: kid.birthPlace.trim(),
        sex: kid.sex,
        notes: kid.notes.trim(),
        file,
      });
    }

    if (participants.length === 0) {
      setError(
        'Aggiungi almeno un campista oppure spunta "il sottoscritto partecipa al camp".',
      );
      setLoading(false);
      return;
    }

    // Capacità (defense-in-depth: il server ricontrolla). Se rimangono meno
    // posti di quanti ne servano, blocchiamo subito senza fare la POST.
    if (availability && availability.remaining !== null) {
      if (availability.remaining <= 0) {
        setError("Posti esauriti per questo evento.");
        setLoading(false);
        return;
      }
      if (participants.length > availability.remaining) {
        setError(
          `Posti insufficienti: rimangono ${availability.remaining} posti, ma stai iscrivendo ${participants.length} partecipanti.`,
        );
        setLoading(false);
        return;
      }
    }

    if (!privacyConsent) {
      setError("Devi accettare l'informativa sulla privacy per iscriverti.");
      setLoading(false);
      return;
    }
    if (!rulesConsent) {
      setError("Devi accettare il regolamento del camp per iscriverti.");
      setLoading(false);
      return;
    }

    // Non serializzare i File nel body JSON (verranno caricati a parte dopo).
    const body = {
      ...subscriber,
      participants: participants.map(({ file: _file, ...rest }) => rest),
      privacyConsent,
      rulesConsent,
    };

    const res = await fetch("/api/registrazioni", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Errore durante il salvataggio.");
      setLoading(false);
      return;
    }

    const created = await res.json();
    // Token opaco che autorizza l'upload dei documenti dal form pubblico.
    const uploadToken: string | undefined = created.uploadToken;

    // Carica i documenti selezionati, abbinandoli ai partecipanti creati
    // per ruolo + nome + data di nascita. Best-effort: se un upload fallisce,
    // l'iscrizione resta valida (il documento si può aggiungere dalla pagina
    // di dettaglio).
    const createdParticipants: {
      id: string;
      role: string;
      firstName: string;
      lastName: string;
      birthDate: string;
    }[] = created.participants ?? [];

    const uploadErrors: string[] = [];
    let uploadIndex = 0;
    const totalUploads = participants.filter((p) => p.file).length;
    for (const p of participants) {
      if (!p.file) continue;
      const match = createdParticipants.find(
        (c) =>
          c.role === p.role &&
          c.firstName === p.firstName &&
          c.lastName === p.lastName &&
          c.birthDate === p.birthDate,
      );
      if (!match) continue;
      uploadIndex++;
      setUploadLabel(
        totalUploads > 1
          ? `Documento ${uploadIndex}/${totalUploads} (${p.firstName})`
          : `Documento di ${p.firstName}`,
      );
      setUploadProgress(0);
      const res = await uploadFile(
        `/api/partecipanti/${match.id}/documento`,
        p.file,
        setUploadProgress,
        { headers: { "X-Upload-Token": uploadToken ?? "" } },
      );
      if (!res.ok) {
        uploadErrors.push(res.error ?? `Documento di ${p.firstName} non caricato.`);
      }
    }

    if (uploadErrors.length > 0) {
      // L'iscrizione è andata a buon fine, ma qualche documento no.
      // Porta l'utente alla pagina di dettaglio per completare.
      setError(
        `Iscrizione creata, ma alcuni documenti non sono stati caricati: ${uploadErrors.join(" ")}`,
      );
      setUploadLabel(null);
      setUploadProgress(0);
      setLoading(false);
      router.push(`/registrazioni/${created.id}`);
      return;
    }

    setUploadLabel(null);
    setUploadProgress(0);
    router.push("/grazie");
  }

  const inputClass =
    "w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">
        Nuova Iscrizione
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Compila il modulo di iscrizione per il camp estivo
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-6"
      >
        {/* Evento */}
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">
            Evento *
          </label>
          <select
            name="eventId"
            required
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          >
            <option value="">Seleziona un evento...</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>

          {selectedEvent && (
            <div className="mt-3 p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg">
              <h3 className="text-sm font-semibold text-emerald-800 mb-2">
                Dettagli Evento
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="text-zinc-500">Anno:</span>{" "}
                  <span className="text-zinc-800 font-medium">
                    {selectedEvent.year}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Data inizio:</span>{" "}
                  <span className="text-zinc-800">
                    {new Date(selectedEvent.startDate).toLocaleDateString(
                      "it-IT",
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Data fine:</span>{" "}
                  <span className="text-zinc-800">
                    {new Date(selectedEvent.endDate).toLocaleDateString(
                      "it-IT",
                    )}
                  </span>
                </div>
                {selectedEvent.location && (
                  <div className="col-span-2">
                    <span className="text-zinc-500">Luogo:</span>{" "}
                    <span className="text-zinc-800">
                      {selectedEvent.location}
                    </span>
                  </div>
                )}
              </div>

              {/* Quote */}
              <div className="mt-3 pt-3 border-t border-emerald-200">
                <p className="text-xs font-semibold text-emerald-800 mb-2">
                  Quote
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-zinc-500">Adulto:</span>{" "}
                    <span className="text-zinc-800 font-medium">
                      {formatEuro(selectedEvent.priceAdult)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">1° campista:</span>{" "}
                    <span className="text-zinc-800">
                      {formatEuro(selectedEvent.priceKid1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">2° campista:</span>{" "}
                    <span className="text-zinc-800">
                      {formatEuro(selectedEvent.priceKid2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">3° campista:</span>{" "}
                    <span className="text-zinc-800">
                      {formatEuro(selectedEvent.priceKid3)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500">Dal 4° campista:</span>{" "}
                    <span className="text-zinc-800">
                      {selectedEvent.priceKid4Plus === 0
                        ? "gratuito"
                        : formatEuro(selectedEvent.priceKid4Plus)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Posti disponibili (solo se l'evento ha un limite) */}
              {selectedEvent.participantLimit !== null && availability && (
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-800 mb-2">
                    Posti disponibili
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      (availability.remaining ?? 0) <= 0
                        ? "text-red-600"
                        : (availability.remaining ?? 0) <= 5
                        ? "text-amber-700"
                        : "text-emerald-800"
                    }`}
                  >
                    {availability.remaining} su {availability.limit}{" "}
                    <span className="text-zinc-500 font-normal">
                      ({availability.taken} occupati)
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <hr className="border-zinc-200" />

        {/* SEZIONE: Il Sottoscritto (genitore/tutore o adulto) */}
        <div>
          <h2 className="text-base font-semibold text-zinc-800 mb-3">
            Il Sottoscritto{" "}
            <span className="text-xs text-zinc-400 font-normal">
              (genitore/tutore o adulto)
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                Cognome *
              </label>
              <input
                name="sottoscrittoLastName"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                Nome *
              </label>
              <input
                name="sottoscrittoFirstName"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                Telefono *
              </label>
              <input
                name="sottoscrittoPhone"
                type="tel"
                required
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                Email *
              </label>
              <input
                name="sottoscrittoEmail"
                type="email"
                required
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Toggle: il sottoscritto partecipa come adulto */}
        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={adultAttending}
              onChange={(e) => setAdultAttending(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-700">
              Il sottoscritto <strong>partecipa al camp</strong> (iscrizione
              adulto). Lascia deselezionato se iscrivi solo dei campisti.
            </span>
          </label>
          {adultAttending && (
            <div className="mt-3 pl-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1">
                    Data di nascita del partecipante adulto *
                  </label>
                  <input
                    type="date"
                    required={adultAttending}
                    value={adultBirthDate}
                    onChange={(e) => setAdultBirthDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1">
                    Sesso *
                  </label>
                  <select
                    required={adultAttending}
                    value={adultSex}
                    onChange={(e) => setAdultSex(e.target.value)}
                    className={`${inputClass} bg-white`}
                  >
                    <option value="">Seleziona…</option>
                    <option value="M">Maschio</option>
                    <option value="F">Femmina</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1">
                    Codice Fiscale *
                  </label>
                  <input
                    required={adultAttending}
                    value={adultTaxId}
                    onChange={(e) => setAdultTaxId(e.target.value)}
                    className={`${inputClass} uppercase`}
                    maxLength={16}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1">
                    Cittadinanza *
                  </label>
                  <Autocomplete
                    required={adultAttending}
                    value={adultNationality}
                    onChange={setAdultNationality}
                    suggestions={STATI}
                    placeholder="es. ITALIA"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-600 mb-1">
                    Luogo di Nascita *
                  </label>
                  <Autocomplete
                    required={adultAttending}
                    value={adultBirthPlace}
                    onChange={setAdultBirthPlace}
                    suggestions={LUOGHI_NASCITA}
                    placeholder="Comune italiano o Stato estero…"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1">
                  Documento d&apos;identità *
                </label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setAdultFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-zinc-600
                    file:mr-3 file:py-1.5 file:px-3
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-emerald-50 file:text-emerald-700
                    hover:file:bg-emerald-100 file:cursor-pointer"
                />
                {adultFile && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {adultFile.name} · {formatBytes(adultFile.size)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1">
                  Note (allergie, info utili)
                </label>
                <textarea
                  value={adultNotes}
                  onChange={(e) => setAdultNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Es. allergie, intolleranze, terapie in corso…"
                />
              </div>
            </div>
          )}
        </div>

        <hr className="border-zinc-200" />

        {/* SEZIONE: Campisti (partecipanti KID) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-zinc-800">
              Campisti{" "}
              <span className="text-xs text-zinc-400 font-normal">
                (partecipanti al camp)
              </span>
            </h2>
            <button
              type="button"
              onClick={addKid}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-medium rounded-lg hover:bg-emerald-100 transition-colors text-sm"
            >
              + Aggiungi campista
            </button>
          </div>

          {kids.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">
              Nessun campista aggiunto. Clicca “Aggiungi campista” per iscrivere
              dei partecipanti (lascia vuoto se si iscrive solo l&apos;adulto).
            </p>
          ) : (
            <div className="space-y-4">
              {kids.map((kid, index) => (
                <div
                  key={index}
                  className="p-4 border border-zinc-200 rounded-lg bg-white space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase">
                      Campista {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeKid(index)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Rimuovi
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">
                        Cognome *
                      </label>
                      <input
                        required
                        value={kid.lastName}
                        onChange={(e) =>
                          updateKid(index, "lastName", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">
                        Nome *
                      </label>
                      <input
                        required
                        value={kid.firstName}
                        onChange={(e) =>
                          updateKid(index, "firstName", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">
                        Data di nascita *
                      </label>
                      <input
                        type="date"
                        required
                        value={kid.birthDate}
                        onChange={(e) =>
                          updateKid(index, "birthDate", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Dati scheda alloggiati: CF e cittadinanza obbligatori per
                      ogni campista, anche quando è iscritto dai genitori. */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">
                        Sesso *
                      </label>
                      <select
                        required
                        value={kid.sex}
                        onChange={(e) =>
                          updateKid(index, "sex", e.target.value)
                        }
                        className={`${inputClass} bg-white`}
                      >
                        <option value="">Seleziona…</option>
                        <option value="M">Maschio</option>
                        <option value="F">Femmina</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-zinc-500 mb-1">
                        Codice Fiscale *
                      </label>
                      <input
                        required
                        value={kid.taxId}
                        onChange={(e) =>
                          updateKid(index, "taxId", e.target.value)
                        }
                        className={`${inputClass} uppercase`}
                        maxLength={16}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">
                        Cittadinanza *
                      </label>
                      <Autocomplete
                        required
                        inputClassName={`${inputClass} text-sm`}
                        value={kid.nationality}
                        onChange={(v) => updateKid(index, "nationality", v)}
                        suggestions={STATI}
                        placeholder="es. ITALIA"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">
                        Luogo di Nascita *
                      </label>
                      <Autocomplete
                        required
                        inputClassName={`${inputClass} text-sm`}
                        value={kid.birthPlace}
                        onChange={(v) => updateKid(index, "birthPlace", v)}
                        suggestions={LUOGHI_NASCITA}
                        placeholder="Comune italiano o Stato estero…"
                      />
                    </div>
                  </div>

                  {/* Documento d'identità del campista (obbligatorio) */}
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">
                      Documento d&apos;identità *
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      onChange={(e) =>
                        setKidFile(index, e.target.files?.[0] ?? null)
                      }
                      className="block w-full text-sm text-zinc-600
                        file:mr-3 file:py-1.5 file:px-3
                        file:rounded-lg file:border-0
                        file:text-sm file:font-medium
                        file:bg-emerald-50 file:text-emerald-700
                        hover:file:bg-emerald-100 file:cursor-pointer"
                    />
                    {kidFiles[index] && (
                      <p className="text-xs text-zinc-500 mt-1">
                        {kidFiles[index]!.name} ·{" "}
                        {formatBytes(kidFiles[index]!.size)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">
                      Note (allergie, info utili)
                    </label>
                    <textarea
                      value={kid.notes}
                      onChange={(e) =>
                        updateKid(index, "notes", e.target.value)
                      }
                      rows={2}
                      className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Es. allergie, intolleranze, terapie in corso…"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-zinc-200" />

        {/* SEZIONE: Indirizzo */}
        <div>
          <h2 className="text-base font-semibold text-zinc-800 mb-3">
            Indirizzo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                Via *
              </label>
              <input name="street" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                CAP *
              </label>
              <input
                name="postalCode"
                required
                className={inputClass}
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                Città *
              </label>
              <input name="city" required className={inputClass} />
            </div>
          </div>
        </div>

        <hr className="border-zinc-200" />

        {/* SEZIONE: Consensi obbligatori */}
        <div className="space-y-4">
          {selectedEvent?.rules?.trim() && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 mb-1">
                Regolamento del camp
              </h3>
              <div className="max-h-48 overflow-y-auto p-3 border border-zinc-200 rounded-lg bg-zinc-50 text-sm text-zinc-700 whitespace-pre-wrap">
                {selectedEvent.rules}
              </div>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyConsent}
              onChange={(e) => setPrivacyConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-700">
              Ho letto e accetto{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-700 hover:underline"
              >
                l&apos;informativa sulla privacy
              </Link>
              . I dati forniti saranno trattati ai soli fini dell&apos;organizzazione
              del camp. *
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rulesConsent}
              onChange={(e) => setRulesConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-700">
              Ho letto e accetto il <strong>regolamento del camp</strong>
              {selectedEvent?.rules?.trim() ? " (riportato sopra)" : ""}. *
            </span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadLabel ? (
                <>
                  <Spinner className="h-4 w-4" />
                  {uploadProgress}%
                </>
              ) : loading ? (
                "Salvando..."
              ) : (
                "Salva Iscrizione"
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="px-6 py-2.5 bg-white border border-zinc-300 text-zinc-700 font-medium rounded-lg hover:bg-zinc-50 transition-colors text-sm disabled:opacity-50"
            >
              Annulla
            </button>
          </div>

          {uploadLabel && (
            <UploadProgress
              label={uploadLabel}
              progress={uploadProgress}
            />
          )}
        </div>
      </form>
    </div>
  );
}
