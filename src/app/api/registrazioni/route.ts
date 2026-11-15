import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CURRENT_PRIVACY_POLICY_VERSION } from "@/lib/consent";
import {
  checkCapacity,
  countActiveParticipants,
} from "@/lib/participant-cap";

interface ParticipantInput {
  role: string; // ADULT | KID
  firstName: string;
  lastName: string;
  birthDate: string;
  taxId?: string;
  nationality?: string;
  birthPlace?: string;
  sex?: string; // M | F
  notes?: string;
}

export async function GET() {
  // Elenco delle iscrizioni: contiene dati personali e i token di upload,
  // quindi riservato allo staff autenticato.
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const registrations = await prisma.registration.findMany({
    include: { event: true, participants: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(registrations);
}

export async function POST(request: Request) {
  // POST iscrizione è pubblico — chiunque può iscriversi
  const body = await request.json();

  const participants: ParticipantInput[] = Array.isArray(body.participants)
    ? body.participants
    : [];

  // Deve esserci almeno un partecipante (adulto che partecipa e/o campisti).
  const validParticipants = participants.filter(
    (p) =>
      p &&
      typeof p.firstName === "string" &&
      p.firstName.trim() !== "" &&
      typeof p.lastName === "string" &&
      p.lastName.trim() !== "" &&
      typeof p.birthDate === "string" &&
      p.birthDate.trim() !== ""
  );

  if (validParticipants.length === 0) {
    return NextResponse.json(
      { error: "Inserisci almeno un partecipante." },
      { status: 400 }
    );
  }

  // Consensi obbligatori (difesa in profondità: validati anche lato client).
  if (!body.privacyConsent || !body.rulesConsent) {
    return NextResponse.json(
      { error: "Devi accettare la privacy e il regolamento del camp." },
      { status: 400 }
    );
  }

  // Limite di partecipanti: se l'evento ne ha uno, verifica la disponibilità
  // in una transazione (count + create atomici) per evitare overbooking tra
  // iscrizioni concorrenti. SQLite serializza le scritture; la transazione
  // rende il check+create indivisibile.
  const event = await prisma.event.findUnique({
    where: { id: body.eventId },
    select: { participantLimit: true, startDate: true, endDate: true },
  });
  if (!event) {
    return NextResponse.json(
      { error: "Evento non trovato." },
      { status: 404 }
    );
  }

  // Permanenza (scheda alloggiati): uguale per tutti i partecipanti, quindi
  // derivata automaticamente dalla durata dell'evento (clamp al max di legge
  // di 30 giorni).
  const stayDays = Math.min(
    30,
    Math.max(
      1,
      Math.round(
        (event.endDate.getTime() - event.startDate.getTime()) / 86_400_000,
      ) + 1,
    ),
  );

  const capacityError =
    event.participantLimit !== null
      ? checkCapacity(
          event.participantLimit,
          await countActiveParticipants(prisma, body.eventId),
          validParticipants.length
        )
      : null;
  if (capacityError) {
    return NextResponse.json({ error: capacityError }, { status: 409 });
  }

  let registration;
  try {
    registration = await prisma.$transaction(async (tx) => {
      // Ricontrolla dentro la transazione: tra il check sopra e ora un'altra
      // iscrizione potrebbe aver occupato gli ultimi posti.
      if (event.participantLimit !== null) {
        const current = await countActiveParticipants(tx, body.eventId);
        const err = checkCapacity(
          event.participantLimit,
          current,
          validParticipants.length
        );
        if (err) throw new Error(err);
      }

      return tx.registration.create({
        data: {
          event: { connect: { id: body.eventId } },
          sottoscrittoFirstName: body.sottoscrittoFirstName,
          sottoscrittoLastName: body.sottoscrittoLastName,
          sottoscrittoTaxId: "",
          sottoscrittoPhone: body.sottoscrittoPhone ?? "",
          sottoscrittoEmail: body.sottoscrittoEmail ?? "",
          street: body.street ?? "",
          postalCode: body.postalCode ?? "",
          city: body.city ?? "",
          notes: body.notes ?? "",
          // Derivata dalla durata dell'evento, non più richiesta in input.
          stayDays,
          privacyConsent: true,
          rulesConsent: true,
          // Traccia del consenso privacy (GDPR art. 7): timestamp + versione.
          privacyConsentAt: new Date(),
          privacyPolicyVersion: CURRENT_PRIVACY_POLICY_VERSION,
          // Token opaco (256 bit) che autorizza l'upload dei documenti dal form
          // pubblico. Restituito solo al creatore dell'iscrizione.
          uploadToken: randomBytes(32).toString("hex"),
          participants: {
            create: validParticipants.map((p) => ({
              role: p.role === "ADULT" ? "ADULT" : "KID",
              firstName: p.firstName,
              lastName: p.lastName,
              birthDate: p.birthDate,
              taxId: p.taxId ?? "",
              nationality: p.nationality ?? "",
              birthPlace: p.birthPlace ?? "",
              sex: p.sex === "M" || p.sex === "F" ? p.sex : "",
              notes: p.notes ?? "",
            })),
          },
        },
        include: { participants: true },
      });
    });
  } catch (e) {
    // Capacità superata (errore sollevato dentro la transazione).
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Posti insufficienti." },
      { status: 409 }
    );
  }

  return NextResponse.json(registration, { status: 201 });
}
