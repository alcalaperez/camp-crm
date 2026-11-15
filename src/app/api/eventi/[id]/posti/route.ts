import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { countActiveParticipants } from "@/lib/participant-cap";

// Disponibilità posti di un evento. Pubblico (come GET /api/eventi), serve al
// modulo di iscrizione per mostrare quanti posti rimangono.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: { participantLimit: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  }

  const limit = event.participantLimit;
  const taken = await countActiveParticipants(prisma, id);
  const remaining = limit === null ? null : Math.max(0, limit - taken);

  return NextResponse.json({ limit, taken, remaining });
}
