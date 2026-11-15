import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import {
  calculateEventTotal,
  computeRegistrationBalance,
  DISCOUNT_METHOD,
  formatEuro,
  kidPriceByOrdinal,
} from "@/lib/pricing";
import { PaymentForm } from "./PaymentForm";
import { StatusForm } from "./StatusForm";
import { DocumentManager } from "./DocumentManager";
import Link from "next/link";

export default async function RegistrazioneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: {
      event: true,
      participants: { orderBy: { createdAt: "asc" } },
      payments: {
        include: { recordedBy: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!registration) notFound();

  // Calcolo quota: adulti (prezzo fisso) + campisti (prezzo a scalare).
  const adultCount = registration.participants.filter(
    (p) => p.role === "ADULT"
  ).length;
  const kidCount = registration.participants.length - adultCount;
  const quotaTotal = calculateEventTotal(registration.event, adultCount, kidCount);
  const { paid: totalPaid, discount, balance } = computeRegistrationBalance(
    quotaTotal,
    registration.payments
  );

  const paymentMethodLabels: Record<string, string> = {
    CONTANTI: "Contanti",
    BONIFICO: "Bonifico",
    CARTA: "Carta",
    [DISCOUNT_METHOD]: "Sconto",
  };

  // Etichetta leggibile del primo partecipante per l'intestazione.
  const firstParticipant = registration.participants[0];
  const headerName = firstParticipant
    ? `${firstParticipant.firstName} ${firstParticipant.lastName}` +
      (registration.participants.length > 1
        ? ` +${registration.participants.length - 1}`
        : "")
    : "Nessun partecipante";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/registrazioni"
        className="text-sm text-zinc-500 hover:text-zinc-700 mb-4 inline-block"
      >
        ← Torna alle iscrizioni
      </Link>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-zinc-900 break-words">{headerName}</h1>
            <p className="text-sm text-zinc-500">
              Iscritto il{" "}
              {new Date(registration.createdAt).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  registration.privacyConsent
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {registration.privacyConsent ? "✅" : "⚠️"} Privacy
              </span>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  registration.rulesConsent
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {registration.rulesConsent ? "✅" : "⚠️"} Regolamento
              </span>
            </div>
          </div>
          <div className="sm:shrink-0">
            <StatusForm
              registrationId={registration.id}
              currentStatus={registration.status}
            />
          </div>
        </div>

        {/* Dati Evento */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100 bg-emerald-50/30">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Evento
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-zinc-400">Nome:</span>{" "}
              <span className="text-zinc-800 font-medium">
                {registration.event.name}
              </span>
            </div>
            <div>
              <span className="text-zinc-400">Anno:</span>{" "}
              <span className="text-zinc-800">{registration.event.year}</span>
            </div>
            <div>
              <span className="text-zinc-400">Data Inizio:</span>{" "}
              <span className="text-zinc-800">
                {new Date(registration.event.startDate).toLocaleDateString("it-IT")}
              </span>
            </div>
            <div>
              <span className="text-zinc-400">Data Fine:</span>{" "}
              <span className="text-zinc-800">
                {new Date(registration.event.endDate).toLocaleDateString("it-IT")}
              </span>
            </div>
            {registration.event.location && (
              <div className="col-span-2">
                <span className="text-zinc-400">Luogo:</span>{" "}
                <span className="text-zinc-800">{registration.event.location}</span>
              </div>
            )}
            {registration.stayDays !== null && (
              <div className="col-span-2">
                <span className="text-zinc-400">Permanenza:</span>{" "}
                <span className="text-zinc-800">
                  {registration.stayDays} giorn{registration.stayDays === 1 ? "o" : "i"}{" "}
                  <span className="text-zinc-400">(durata dell&apos;evento)</span>
                </span>
              </div>
            )}
            {registration.event.participantLimit !== null && (
              <div className="col-span-2">
                <span className="text-zinc-400">Posti (evento):</span>{" "}
                <span className="text-zinc-800">
                  limite {registration.event.participantLimit} partecipanti
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Dati sottoscritto */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Il Sottoscritto
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-zinc-400">Nome e Cognome:</span>{" "}
              <span className="text-zinc-800 font-medium">
                {registration.sottoscrittoFirstName}{" "}
                {registration.sottoscrittoLastName}
              </span>
            </div>
            {registration.sottoscrittoPhone && (
              <div>
                <span className="text-zinc-400">Telefono:</span>{" "}
                <span className="text-zinc-800">
                  {registration.sottoscrittoPhone}
                </span>
              </div>
            )}
            {registration.sottoscrittoEmail && (
              <div>
                <span className="text-zinc-400">Email:</span>{" "}
                <span className="text-zinc-800">
                  {registration.sottoscrittoEmail}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Partecipanti */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Partecipanti ({registration.participants.length})
          </h2>

          {registration.participants.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">Nessun partecipante.</p>
          ) : (
            <div className="space-y-4">
              {registration.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="p-4 border border-zinc-200 rounded-lg bg-white"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        participant.role === "ADULT"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {participant.role === "ADULT" ? "Adulto" : "Campista"}
                    </span>
                    <span className="text-sm font-medium text-zinc-800">
                      {participant.firstName} {participant.lastName}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-500 mb-3">
                    <div>
                      <span className="text-zinc-400">Nascita:</span>{" "}
                      {participant.birthDate}
                    </div>
                    {participant.sex && (
                      <div>
                        <span className="text-zinc-400">Sesso:</span>{" "}
                        {participant.sex === "M" ? "Maschio" : "Femmina"}
                      </div>
                    )}
                    {participant.birthPlace && (
                      <div>
                        <span className="text-zinc-400">Luogo di nascita:</span>{" "}
                        {participant.birthPlace}
                      </div>
                    )}
                    {participant.taxId && (
                      <div>
                        <span className="text-zinc-400">CF:</span>{" "}
                        {participant.taxId}
                      </div>
                    )}
                    {participant.nationality && (
                      <div>
                        <span className="text-zinc-400">Cittadinanza:</span>{" "}
                        {participant.nationality}
                      </div>
                    )}
                  </div>
                  {participant.notes && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-3 whitespace-pre-wrap">
                      📝 {participant.notes}
                    </p>
                  )}
                  <DocumentManager
                    participantId={participant.id}
                    document={{
                      idDocumentPath: participant.idDocumentPath,
                      idDocumentName: participant.idDocumentName,
                      idDocumentMime: participant.idDocumentMime,
                      idDocumentSize: participant.idDocumentSize,
                      idDocumentUploadedAt: participant.idDocumentUploadedAt
                        ? participant.idDocumentUploadedAt.toISOString()
                        : null,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indirizzo */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Indirizzo
          </h2>
          <div className="text-sm text-zinc-800">
            {registration.street && <p>{registration.street}</p>}
            {(registration.postalCode || registration.city) && (
              <p>
                {registration.postalCode} {registration.city}
              </p>
            )}
            {!registration.street &&
              !registration.postalCode &&
              !registration.city && (
                <p className="text-zinc-400 italic">Non specificato</p>
              )}
          </div>
        </div>

        {/* Quota */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100 bg-emerald-50/30">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Quota
          </h2>
          <div className="space-y-1 text-sm">
            {adultCount > 0 && (
              <div className="flex justify-between text-zinc-700">
                <span>
                  {adultCount} Adulto{adultCount > 1 ? "×" : ""} ×{" "}
                  {formatEuro(registration.event.priceAdult)}
                </span>
                <span>{formatEuro(adultCount * registration.event.priceAdult)}</span>
              </div>
            )}
            {Array.from({ length: kidCount }, (_, i) => i + 1).map((ordinal) => (
              <div
                key={ordinal}
                className="flex justify-between text-zinc-700"
              >
                <span>
                  {ordinal}° Campista
                  {kidPriceByOrdinal(registration.event, ordinal) === 0 && " (gratuito)"}
                </span>
                <span>{formatEuro(kidPriceByOrdinal(registration.event, ordinal))}</span>
              </div>
            ))}
            {quotaTotal === 0 && (
              <p className="text-zinc-400 italic">Nessuna quota configurata.</p>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-200 space-y-1 text-sm">
            <div className="flex justify-between font-semibold text-zinc-800">
              <span>Totale</span>
              <span>{formatEuro(quotaTotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sky-700">
                <span>Sconto</span>
                <span>−{formatEuro(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600">
              <span>Già pagato</span>
              <span>{formatEuro(totalPaid)}</span>
            </div>
            <div
              className={`flex justify-between font-semibold ${
                balance > 0 ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              <span>Saldo</span>
              <span>{formatEuro(balance)}</span>
            </div>
          </div>
        </div>

        {/* Pagamenti */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
              Pagamenti
            </h2>
            {totalPaid > 0 && (
              <span className="text-sm font-medium text-emerald-700">
                Totale pagato: €{totalPaid.toFixed(2)}
              </span>
            )}
          </div>

          {registration.payments.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">
              Nessun pagamento registrato.
            </p>
          ) : (
            <div className="space-y-2">
              {registration.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-zinc-50 rounded-lg px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span
                        className={`font-medium ${
                          payment.paymentMethod === DISCOUNT_METHOD
                            ? "text-sky-700"
                            : payment.paid
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}
                      >
                        {payment.paymentMethod === DISCOUNT_METHOD
                          ? "🏷️"
                          : payment.paid
                          ? "✅"
                          : "⚠️"}{" "}
                        €{payment.amount.toFixed(2)}
                      </span>
                      <span className="text-zinc-400 ml-2">
                        {paymentMethodLabels[payment.paymentMethod] ??
                          payment.paymentMethod}
                      </span>
                      {payment.paymentDate && (
                        <span className="text-zinc-400 ml-2">
                          {new Date(payment.paymentDate).toLocaleDateString("it-IT")}
                        </span>
                      )}
                    </div>
                    <div className="text-zinc-400 text-xs">
                      {payment.recordedBy.name}
                    </div>
                  </div>
                  {payment.notes && (
                    <p className="text-zinc-500 text-xs mt-1 italic">
                      {payment.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registra pagamento */}
        <div className="px-4 sm:px-6 py-4">
          <PaymentForm registrationId={registration.id} />
        </div>
      </div>
    </div>
  );
}
