import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { participantSummary } from "@/lib/participants";
import {
  calculateEventTotal,
  computeRegistrationBalance,
  formatEuro,
} from "@/lib/pricing";

export default async function HomePage() {
  const session = await auth();

  // Pagina pubblica per visitatori
  if (!session) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">
          🏕️ Camp Estivo
        </h1>
        <p className="text-lg text-zinc-500 mb-8 leading-relaxed">
          Iscrizioni aperte per il camp estivo. Compila il modulo online in
          pochi minuti.
        </p>
        <Link
          href="/registrazioni/nuova"
          className="inline-flex px-8 py-3 bg-emerald-600 text-white text-lg font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-md"
        >
          Iscriviti ora
        </Link>
        <div className="mt-16 border-t border-zinc-200 pt-8">
          <p className="text-sm text-zinc-400 mb-3">Sei dello staff?</p>
          <Link
            href="/login"
            className="text-sm text-emerald-600 hover:underline font-medium"
          >
            Accedi al pannello di gestione
          </Link>
        </div>
      </div>
    );
  }

  // Dashboard per staff/admin
  const [totalRegistrations, pendingPayments, totalEvents, recentRegistrations] =
    await Promise.all([
      prisma.registration.count(),
      prisma.payment.count({ where: { paid: false } }),
      prisma.event.count({ where: { active: true } }),
      prisma.registration.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { event: true, participants: true, payments: true },
      }),
    ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Dashboard</h1>

      {/* Statistiche */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Totale Iscrizioni</p>
          <p className="text-3xl font-bold text-zinc-900">
            {totalRegistrations}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Pagamenti in Sospeso</p>
          <p className="text-3xl font-bold text-amber-600">
            {pendingPayments}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Eventi Attivi</p>
          <p className="text-3xl font-bold text-emerald-700">{totalEvents}</p>
        </div>
      </div>

      {/* Azioni rapide */}
      <div className="flex gap-3 mb-8">
        <Link
          href="/registrazioni/nuova"
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
        >
          + Nuova Iscrizione
        </Link>
        <Link
          href="/registrazioni"
          className="inline-flex items-center px-4 py-2 bg-white border border-zinc-300 text-zinc-700 font-medium rounded-lg hover:bg-zinc-50 transition-colors text-sm"
        >
          Vedi tutte le iscrizioni
        </Link>
      </div>

      {/* Iscrizioni recenti */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-200">
          <h2 className="font-semibold text-zinc-900">Iscrizioni Recenti</h2>
        </div>
        {recentRegistrations.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-500 text-sm">
            Nessuna iscrizione ancora.{" "}
            <Link
              href="/registrazioni/nuova"
              className="text-emerald-600 hover:underline"
            >
              Crea la prima iscrizione
            </Link>
            .
          </div>
        ) : (
          <>
          <div className="hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-zinc-500">
                <th className="px-5 py-3 font-medium">Partecipanti</th>
                <th className="px-5 py-3 font-medium">Genitore/Tutore</th>
                <th className="px-5 py-3 font-medium">Evento</th>
                <th className="px-5 py-3 font-medium">Stato</th>
                <th className="px-5 py-3 font-medium">Importo</th>
                <th className="px-5 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentRegistrations.map((reg) => {
                const adults = reg.participants.filter((p) => p.role === "ADULT").length;
                const total = calculateEventTotal(reg.event, adults, reg.participants.length - adults);
                const { balance } = computeRegistrationBalance(total, reg.payments);
                return (
                <tr
                  key={reg.id}
                  className="border-b border-zinc-50 hover:bg-zinc-50"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/registrazioni/${reg.id}`}
                      className="text-emerald-700 hover:underline font-medium"
                    >
                      {participantSummary(reg.participants)}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {reg.sottoscrittoFirstName} {reg.sottoscrittoLastName}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{reg.event.name}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        reg.status === "CONFIRMED"
                          ? "bg-emerald-50 text-emerald-700"
                          : reg.status === "CANCELLED"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {reg.status === "CONFIRMED"
                        ? "Confermato"
                        : reg.status === "CANCELLED"
                        ? "Cancellato"
                        : "In attesa"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-zinc-800">
                      {formatEuro(total)}
                    </div>
                    {balance > 0 ? (
                      <div className="text-amber-600 text-xs font-medium">
                        saldo {formatEuro(balance)}
                      </div>
                    ) : (
                      <div className="text-emerald-600 text-xs font-medium">
                        ✅ pagato
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-500">
                    {new Date(reg.createdAt).toLocaleDateString("it-IT")}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Vista mobile: schede impilate */}
          <div className="space-y-3 sm:hidden">
            {recentRegistrations.map((reg) => {
              const adults = reg.participants.filter((p) => p.role === "ADULT").length;
              const total = calculateEventTotal(reg.event, adults, reg.participants.length - adults);
              const { balance } = computeRegistrationBalance(total, reg.payments);
              return (
                <Link
                  key={reg.id}
                  href={`/registrazioni/${reg.id}`}
                  className="block bg-white border border-zinc-200 rounded-xl p-4 active:bg-zinc-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-emerald-700 truncate">
                        {participantSummary(reg.participants)}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {reg.sottoscrittoFirstName} {reg.sottoscrittoLastName}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        reg.status === "CONFIRMED"
                          ? "bg-emerald-50 text-emerald-700"
                          : reg.status === "CANCELLED"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {reg.status === "CONFIRMED"
                        ? "Confermato"
                        : reg.status === "CANCELLED"
                        ? "Cancellato"
                        : "In attesa"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="text-xs text-zinc-500">
                      <p className="truncate">{reg.event.name}</p>
                      <p>{new Date(reg.createdAt).toLocaleDateString("it-IT")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-zinc-800">
                        {formatEuro(total)}
                      </p>
                      {balance > 0 ? (
                        <p className="text-amber-600 text-xs font-medium">
                          saldo {formatEuro(balance)}
                        </p>
                      ) : (
                        <p className="text-emerald-600 text-xs font-medium">
                          ✅ pagato
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
