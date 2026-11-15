import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { computeRegistrationIncome } from "@/lib/bilancio";
import { participantSummary } from "@/lib/participants";
import { BilancioView } from "./BilancioView";

export default async function BilancioPage() {
  await requireAuth();

  const [events, expenses, incomes, registrations] = await Promise.all([
    prisma.event.findMany({
      orderBy: { year: "desc" },
      select: { id: true, name: true },
    }),
    prisma.expense.findMany({
      include: { event: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.income.findMany({
      include: { event: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.registration.findMany({
      include: {
        event: true,
        participants: { orderBy: { createdAt: "asc" } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Serializza per il client component (DateTime non è serializzabile).
  const expenseRows = expenses.map((e) => ({
    id: e.id,
    eventId: e.eventId,
    eventName: e.event.name,
    title: e.title,
    category: e.category,
    amount: e.amount,
    date: e.date.toISOString(),
    notes: e.notes,
  }));

  const incomeRows = incomes.map((i) => ({
    id: i.id,
    eventId: i.eventId,
    eventName: i.event.name,
    title: i.title,
    source: i.source,
    amount: i.amount,
    date: i.date.toISOString(),
    notes: i.notes,
  }));

  // Aggregazione per iscrizione: quota calcolata, denaro ricevuto, sconti.
  const registrationRows = registrations.map((r) => {
    const adultCount = r.participants.filter((p) => p.role === "ADULT").length;
    const kidCount = r.participants.length - adultCount;
    const income = computeRegistrationIncome(
      r.eventId,
      r.status,
      r.event,
      adultCount,
      kidCount,
      r.payments
    );
    return {
      id: r.id,
      eventName: r.event.name,
      participantsSummary: participantSummary(r.participants),
      sottoscritto: `${r.sottoscrittoFirstName} ${r.sottoscrittoLastName}`.trim(),
      ...income,
      due: income.quotaTotal - income.paid - income.discount,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Bilancio</h1>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-12 text-center">
          <p className="text-zinc-500">
            Crea prima un evento per gestire spese e entrate.
          </p>
        </div>
      ) : (
        <BilancioView
          events={events}
          expenses={expenseRows}
          incomes={incomeRows}
          registrations={registrationRows}
        />
      )}
    </div>
  );
}
