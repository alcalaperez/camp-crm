import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { normalizeParticipantLimit } from "@/lib/participant-cap";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Modifica evento: solo ADMIN.
  const unauthorized = assertRole(await auth(), "ADMIN");
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json();

  // Aggiornamento parziale: includi nel `data` solo i campi effettivamente
  // presenti nel body. Così un salvataggio solo del regolamento (o solo dello
  // stato attivo) non azzera gli altri campi.
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.year !== undefined) data.year = body.year;
  if (body.startDate !== undefined)
    data.startDate = body.startDate ? new Date(body.startDate) : undefined;
  if (body.endDate !== undefined)
    data.endDate = body.endDate ? new Date(body.endDate) : undefined;
  if (body.location !== undefined) data.location = body.location;
  if (body.active !== undefined) data.active = body.active;
  if (body.priceAdult !== undefined) data.priceAdult = body.priceAdult;
  if (body.priceKid1 !== undefined) data.priceKid1 = body.priceKid1;
  if (body.priceKid2 !== undefined) data.priceKid2 = body.priceKid2;
  if (body.priceKid3 !== undefined) data.priceKid3 = body.priceKid3;
  if (body.priceKid4Plus !== undefined) data.priceKid4Plus = body.priceKid4Plus;
  if (body.participantLimit !== undefined)
    data.participantLimit = normalizeParticipantLimit(body.participantLimit);
  // Il regolamento è coperto dal guard ADMIN qui sopra (PUT intero = ADMIN).
  if (body.rules !== undefined) {
    data.rules = body.rules;
  }

  const event = await prisma.event.update({ where: { id }, data });

  return NextResponse.json(event);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Eliminazione evento: solo ADMIN.
  const unauthorized = assertRole(await auth(), "ADMIN");
  if (unauthorized) return unauthorized;

  const { id } = await params;

  // Controlla se ci sono iscrizioni collegate
  const registrationCount = await prisma.registration.count({
    where: { eventId: id },
  });

  if (registrationCount > 0) {
    return NextResponse.json(
      { error: `Impossibile eliminare: ci sono ${registrationCount} iscrizioni collegate. Disattiva l'evento invece.` },
      { status: 400 }
    );
  }

  await prisma.event.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
