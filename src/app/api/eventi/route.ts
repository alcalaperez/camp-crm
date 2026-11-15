import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { normalizeParticipantLimit } from "@/lib/participant-cap";

export async function GET() {
  // GET eventi è pubblico — serve al modulo di iscrizione
  const events = await prisma.event.findMany({
    where: { active: true },
    orderBy: { year: "desc" },
  });
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  // Creazione evento: solo ADMIN.
  const unauthorized = assertRole(await auth(), "ADMIN");
  if (unauthorized) return unauthorized;

  const body = await request.json();

  const event = await prisma.event.create({
    data: {
      name: body.name,
      year: body.year,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      location: body.location ?? "",
      priceAdult: body.priceAdult ?? 0,
      priceKid1: body.priceKid1 ?? 0,
      priceKid2: body.priceKid2 ?? 0,
      priceKid3: body.priceKid3 ?? 0,
      priceKid4Plus: body.priceKid4Plus ?? 0,
      // null = illimitato.
      participantLimit: normalizeParticipantLimit(body.participantLimit),
    },
  });

  return NextResponse.json(event, { status: 201 });
}
