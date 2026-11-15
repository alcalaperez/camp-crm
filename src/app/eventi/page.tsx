import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { formatEuro } from "@/lib/pricing";
import { EventForm } from "./EventForm";
import { EventActions } from "./EventActions";
import { EventRulesEditor } from "./EventRulesEditor";

export default async function EventiPage() {
  const session = await requireAuth();
  const isAdmin = session.user.role === "ADMIN";

  const events = await prisma.event.findMany({
    orderBy: { year: "desc" },
    include: {
      registrations: {
        where: { status: { not: "CANCELLED" } },
        select: { _count: { select: { participants: true } } },
      },
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Eventi</h1>

      <div className="space-y-3 mb-8">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-zinc-900">{event.name}</h3>
                <p className="text-sm text-zinc-500">
                  {new Date(event.startDate).toLocaleDateString("it-IT")} –{" "}
                  {new Date(event.endDate).toLocaleDateString("it-IT")}
                  {event.location && ` • ${event.location}`}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Quote: adulto {formatEuro(event.priceAdult)} · campisti{" "}
                  {formatEuro(event.priceKid1)} / {formatEuro(event.priceKid2)} /{" "}
                  {formatEuro(event.priceKid3)} / dal 4°{" "}
                  {event.priceKid4Plus === 0
                    ? "gratuito"
                    : formatEuro(event.priceKid4Plus)}
                </p>
                {(() => {
                  const activeParticipants = event.registrations.reduce(
                    (sum, r) => sum + r._count.participants,
                    0
                  );
                  const activeRegs = event.registrations.length;
                  return (
                    <p className="text-xs text-zinc-400 mt-1">
                      {activeRegs} iscrizion{activeRegs === 1 ? "e" : "i"}
                      {event.participantLimit !== null
                        ? ` · ${activeParticipants}/${event.participantLimit} posti`
                        : activeParticipants > 0
                        ? ` · ${activeParticipants} partecipanti`
                        : ""}
                    </p>
                  );
                })()}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    event.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {event.active ? "Attivo" : "Inattivo"}
                </span>
                {isAdmin && <EventActions event={event} />}
              </div>
            </div>

            {/* Regolamento: anteprima per tutti, editor per ADMIN */}
            <div className="mt-3 pt-3 border-t border-zinc-100">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">
                Regolamento
              </p>
              {event.rules.trim() ? (
                <div className="max-h-32 overflow-y-auto text-sm text-zinc-700 whitespace-pre-wrap">
                  {event.rules}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">
                  Nessun regolamento configurato.
                </p>
              )}
              {isAdmin && (
                <EventRulesEditor
                  eventId={event.id}
                  initialRules={event.rules}
                />
              )}
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-12 text-center">
            <p className="text-zinc-500">Nessun evento creato.</p>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-zinc-800 mb-4">
            Crea Nuovo Evento
          </h2>
          <EventForm />
        </div>
      )}
    </div>
  );
}
