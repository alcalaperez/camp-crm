import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import {
  IscrizioniFilters,
  type RegistrationRow,
} from "./IscrizioniFilters";

export default async function RegistrazioniPage() {
  await requireAuth();

  const [registrations, events] = await Promise.all([
    prisma.registration.findMany({
      include: { event: true, participants: true, payments: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.event.findMany({
      orderBy: { year: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  // Serializza le date per il client component (i campi DateTime non sono
  // serializzabili in JSON). Mantiene solo i campi usati dai filtri/viste.
  const rows: RegistrationRow[] = registrations.map((reg) => ({
    id: reg.id,
    createdAt: reg.createdAt.toISOString(),
    status: reg.status,
    city: reg.city,
    sottoscrittoFirstName: reg.sottoscrittoFirstName,
    sottoscrittoLastName: reg.sottoscrittoLastName,
    event: {
      id: reg.event.id,
      name: reg.event.name,
      priceAdult: reg.event.priceAdult,
      priceKid1: reg.event.priceKid1,
      priceKid2: reg.event.priceKid2,
      priceKid3: reg.event.priceKid3,
      priceKid4Plus: reg.event.priceKid4Plus,
    },
    participants: reg.participants.map((p) => ({
      role: p.role,
      firstName: p.firstName,
      lastName: p.lastName,
    })),
    payments: reg.payments.map((p) => ({
      paid: p.paid,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
    })),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Iscrizioni</h1>
        <Link
          href="/registrazioni/nuova"
          className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
        >
          + Nuova Iscrizione
        </Link>
      </div>

      {registrations.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-12 text-center">
          <p className="text-zinc-500 mb-4">Nessuna iscrizione presente.</p>
          <Link
            href="/registrazioni/nuova"
            className="text-emerald-600 hover:underline text-sm font-medium"
          >
            Crea la prima iscrizione →
          </Link>
        </div>
      ) : (
        <IscrizioniFilters registrations={rows} events={events} />
      )}
    </div>
  );
}
