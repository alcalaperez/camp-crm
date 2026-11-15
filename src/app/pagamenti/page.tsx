import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { PagamentiFilters, type PaymentRow } from "./PagamentiFilters";

export default async function PagamentiPage() {
  await requireAuth();

  const [payments, events] = await Promise.all([
    prisma.payment.findMany({
      include: {
        registration: { include: { event: true, participants: true } },
        recordedBy: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.event.findMany({
      orderBy: { year: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  // Serializza per il client component (DateTime non è serializzabile in JSON).
  const rows: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    amount: p.amount,
    paymentMethod: p.paymentMethod,
    paymentDate: p.paymentDate ? p.paymentDate.toISOString() : null,
    notes: p.notes,
    recordedByName: p.recordedBy.name,
    registration: {
      sottoscrittoFirstName: p.registration.sottoscrittoFirstName,
      sottoscrittoLastName: p.registration.sottoscrittoLastName,
      eventName: p.registration.event.name,
      eventId: p.registration.event.id,
      participants: p.registration.participants.map((pt) => ({
        firstName: pt.firstName,
        lastName: pt.lastName,
      })),
    },
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Pagamenti</h1>

      {payments.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-12 text-center">
          <p className="text-zinc-500">Nessun pagamento registrato.</p>
        </div>
      ) : (
        <PagamentiFilters payments={rows} events={events} />
      )}
    </div>
  );
}
