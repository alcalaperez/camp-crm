// Seed DIMOSTRATIVO (rieseguibile): popola il CRM con un dataset vario per
// demo e prove — iscrizioni con combinazioni diverse di stato, pagamenti
// (acconti, saldi, sconti), famiglie numerose, cittadinanze/luoghi di nascita
// esteri, più spese e entrate extra per il Bilancio.
//
// PROPRIETÀ DEI DATI: questo script possiede gli eventi "Camp Estivo 2026" e
// "Camp Inverno 2026". A ogni run cancella e ricrea TUTTO ciò che vi
// appartiene (iscrizioni, partecipanti, pagamenti, spese, entrate) e gli
// eventi stessi. Eventi e iscrizioni con altri nomi NON vengono toccati.
//
// Uso: npm run db:seed:demo

import { randomBytes } from "crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { CURRENT_PRIVACY_POLICY_VERSION } from "../src/lib/consent";
import { formatEuro } from "../src/lib/pricing";
import { computeCampBalance, computeRegistrationIncome } from "../src/lib/bilancio";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const DEMO_EVENT_NAMES = ["Camp Estivo 2026", "Camp Inverno 2026"];

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/** Codice fiscale plausibile (non verificabile): solo per dati demo. */
function fakeCf(lastName: string, firstName: string, male: boolean, isoBirth: string): string {
  const consonants = (s: string) => s.toUpperCase().replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/g, "");
  const vowels = (s: string) => s.toUpperCase().replace(/[^AEIOU]/g, "");
  const [y, m, d] = isoBirth.split("-");
  const monthCodes = "ABCDEHLMPRST";
  const monthChar = monthCodes[Number(m) - 1] ?? "X";
  const day = String(Number(d) + (male ? 0 : 40)).padStart(2, "0");
  const cf = `${consonants(lastName).padEnd(3, "X").slice(0, 3)}${consonants(firstName).padStart(1, "X").slice(0, 1)}${vowels(firstName).padStart(2, "X").slice(0, 2)}${y.slice(2)}${monthChar}${day}H501${randomBytes(1).toString("hex").toUpperCase().padEnd(1, "A")}`;
  return cf.slice(0, 16).padEnd(16, "X");
}

// --------------------------------------------------------------- specifiche

interface DemoKid {
  firstName: string;
  lastName: string;
  sex: "M" | "F";
  birth: string; // ISO yyyy-mm-dd (formato prodotto dal form reale)
  birthPlace: string;
  nationality: string;
  notes?: string;
}

interface DemoPayment {
  amount: number;
  method: "CONTANTI" | "BONIFICO" | "CARTA" | "SCONTO";
  daysAgo: number;
  notes?: string;
}

interface DemoRegistration {
  lastName: string; // anche per i figli, se non diversamente specificato
  firstName: string;
  phone: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdDaysAgo: number;
  adult?: { sex: "M" | "F"; birth: string; birthPlace: string; nationality: string; notes?: string };
  kids: DemoKid[];
  payments: DemoPayment[];
}

const estivo2026: DemoRegistration[] = [
  // --- CONFIRMED, pagamenti completi / parziali / sconti ---
  {
    lastName: "Rossi", firstName: "Luca", phone: "340 1112233", email: "luca.rossi@example.it",
    street: "Via delle Palme 12", postalCode: "00172", city: "Roma",
    status: "CONFIRMED", createdDaysAgo: 30,
    kids: [
      { firstName: "Giulia", lastName: "Rossi", sex: "F", birth: "2013-05-18", birthPlace: "Roma", nationality: "ITALIA", notes: "Allergia alle arachidi" },
      { firstName: "Francesco", lastName: "Rossi", sex: "M", birth: "2015-09-02", birthPlace: "Roma", nationality: "ITALIA" },
    ],
    payments: [{ amount: 340, method: "BONIFICO", daysAgo: 28, notes: "Quota completa 2 campisti" }],
  },
  {
    lastName: "Ferrari", firstName: "Anna", phone: "347 9988771", email: "anna.ferrari@example.it",
    street: "Corso Italia 45", postalCode: "24121", city: "Bergamo",
    status: "CONFIRMED", createdDaysAgo: 27,
    kids: [
      { firstName: "Sofia", lastName: "Ferrari", sex: "F", birth: "2012-03-11", birthPlace: "Bergamo", nationality: "ITALIA" },
      { firstName: "Alessandro", lastName: "Ferrari", sex: "M", birth: "2014-07-25", birthPlace: "Bergamo", nationality: "ITALIA", notes: "Terapie in corso: ventilina" },
      { firstName: "Chiara", lastName: "Ferrari", sex: "F", birth: "2016-01-30", birthPlace: "Bergamo", nationality: "ITALIA" },
    ],
    payments: [{ amount: 300, method: "CONTANTI", daysAgo: 25, notes: "Acconto" }],
  },
  {
    lastName: "Esposito", firstName: "Marco", phone: "333 4455667", email: "marco.esposito@example.it",
    street: "Via Toledo 210", postalCode: "80132", city: "Napoli",
    status: "CONFIRMED", createdDaysAgo: 25,
    adult: { sex: "M", birth: "1982-11-08", birthPlace: "Napoli", nationality: "ITALIA" },
    kids: [
      { firstName: "Davide", lastName: "Esposito", sex: "M", birth: "2014-02-14", birthPlace: "Napoli", nationality: "ITALIA" },
    ],
    payments: [{ amount: 340, method: "CARTA", daysAgo: 24, notes: "Adulto + 1 campista" }],
  },
  {
    lastName: "Russo", firstName: "Giuseppina", phone: "366 1239876", email: "giuseppina.russo@example.it",
    street: "Via Etnea 88", postalCode: "95124", city: "Catania",
    status: "CONFIRMED", createdDaysAgo: 22,
    kids: [
      { firstName: "Matteo", lastName: "Russo", sex: "M", birth: "2011-06-01", birthPlace: "Catania", nationality: "ITALIA" },
      { firstName: "Lucrezia", lastName: "Russo", sex: "F", birth: "2013-10-19", birthPlace: "Catania", nationality: "ITALIA" },
      { firstName: "Simone", lastName: "Russo", sex: "M", birth: "2015-04-07", birthPlace: "Catania", nationality: "ITALIA" },
      { firstName: "Andrea", lastName: "Russo", sex: "M", birth: "2017-12-03", birthPlace: "Catania", nationality: "ITALIA", notes: "4° campista gratuito" },
    ],
    payments: [
      { amount: 40, method: "SCONTO", daysAgo: 20, notes: "Sconto fratelli numerosi" },
      { amount: 400, method: "BONIFICO", daysAgo: 18 },
    ],
  },
  {
    lastName: "Marino", firstName: "Paolo", phone: "348 7776655", email: "paolo.marino@example.it",
    street: "Via Garibaldi 7", postalCode: "16100", city: "Genova",
    status: "CONFIRMED", createdDaysAgo: 20,
    kids: [
      { firstName: "Ludovica", lastName: "Marino", sex: "F", birth: "2012-08-22", birthPlace: "Genova", nationality: "ITALIA" },
      { firstName: "Gabriele", lastName: "Marino", sex: "M", birth: "2014-11-11", birthPlace: "Genova", nationality: "ITALIA" },
      { firstName: "Beatrice", lastName: "Marino", sex: "F", birth: "2016-05-29", birthPlace: "Genova", nationality: "ITALIA" },
    ],
    payments: [
      { amount: 200, method: "CONTANTI", daysAgo: 19, notes: "Acconto" },
      { amount: 240, method: "CONTANTI", daysAgo: 5, notes: "Saldo" },
    ],
  },
  {
    lastName: "Conti", firstName: "Paola", phone: "339 1122445", email: "paola.conti@example.it",
    street: "Via Mazzini 33", postalCode: "41121", city: "Modena",
    status: "CONFIRMED", createdDaysAgo: 18,
    adult: { sex: "F", birth: "1979-03-15", birthPlace: "Modena", nationality: "ITALIA", notes: "Accompagnatrice" },
    kids: [],
    payments: [{ amount: 150, method: "CARTA", daysAgo: 17, notes: "Solo adulto" }],
  },
  {
    lastName: "Bruno", firstName: "Chiara", phone: "342 5566778", email: "chiara.bruno@example.it",
    street: "Via Roma 105", postalCode: "25121", city: "Brescia",
    status: "CONFIRMED", createdDaysAgo: 15,
    kids: [
      { firstName: "Riccardo", lastName: "Bruno", sex: "M", birth: "2013-01-09", birthPlace: "Brescia", nationality: "ITALIA" },
      { firstName: "Elisa", lastName: "Bruno", sex: "F", birth: "2015-07-17", birthPlace: "Brescia", nationality: "ITALIA" },
    ],
    payments: [
      { amount: 50, method: "SCONTO", daysAgo: 14, notes: "Sconto disagio" },
      { amount: 240, method: "BONIFICO", daysAgo: 3 },
    ],
  },
  {
    lastName: "Ricci", firstName: "Sabrina", phone: "331 9081726", email: "sabrina.ricci@example.it",
    street: "Via Verdi 18", postalCode: "35122", city: "Padova",
    status: "CONFIRMED", createdDaysAgo: 12,
    kids: [
      { firstName: "Tommaso", lastName: "Ricci", sex: "M", birth: "2011-02-27", birthPlace: "Padova", nationality: "ITALIA" },
      { firstName: "Aurora", lastName: "Ricci", sex: "F", birth: "2013-09-14", birthPlace: "Padova", nationality: "ITALIA" },
      { firstName: "Leonardo", lastName: "Ricci", sex: "M", birth: "2015-06-06", birthPlace: "Padova", nationality: "ITALIA" },
      { firstName: "Ginevra", lastName: "Ricci", sex: "F", birth: "2017-03-21", birthPlace: "Padova", nationality: "ITALIA" },
      { firstName: "Edoardo", lastName: "Ricci", sex: "M", birth: "2019-08-30", birthPlace: "Padova", nationality: "ITALIA", notes: "5° campista gratuito" },
    ],
    payments: [{ amount: 350, method: "BONIFICO", daysAgo: 10, notes: "Acconto famiglia numerosa" }],
  },

  // --- PENDING: in attesa di conferma, con/senza acconti ---
  {
    lastName: "Colombo", firstName: "Franco", phone: "335 4433221", email: "franco.colombo@example.it",
    street: "Piazza Duomo 4", postalCode: "20121", city: "Milano",
    status: "PENDING", createdDaysAgo: 8,
    kids: [
      { firstName: "Martina", lastName: "Colombo", sex: "F", birth: "2014-12-05", birthPlace: "Milano", nationality: "ITALIA" },
    ],
    payments: [],
  },
  {
    lastName: "Moretti", firstName: "Elena", phone: "346 6050512", email: "elena.moretti@example.it",
    street: "Via Dante 52", postalCode: "50122", city: "Firenze",
    status: "PENDING", createdDaysAgo: 7,
    kids: [
      { firstName: "Federico", lastName: "Moretti", sex: "M", birth: "2012-04-16", birthPlace: "Firenze", nationality: "ITALIA" },
      { firstName: "Agnese", lastName: "Moretti", sex: "F", birth: "2014-10-02", birthPlace: "Firenze", nationality: "ITALIA" },
    ],
    payments: [{ amount: 100, method: "CONTANTI", daysAgo: 6, notes: "Acconto" }],
  },
  {
    lastName: "Greco", firstName: "Antonio", phone: "344 2341234", email: "antonio.greco@example.it",
    street: "Via Crispi 71", postalCode: "89125", city: "Reggio Calabria",
    status: "PENDING", createdDaysAgo: 5,
    kids: [
      { firstName: "Carmine", lastName: "Greco", sex: "M", birth: "2015-08-08", birthPlace: "Reggio Calabria", nationality: "ITALIA" },
    ],
    payments: [],
  },
  {
    lastName: "Mancini", firstName: "Fatima", phone: "351 7845129", email: "fatima.mancini@example.it",
    street: "Via Palmiro Togliatti 9", postalCode: "10154", city: "Torino",
    status: "PENDING", createdDaysAgo: 4,
    kids: [
      { firstName: "Youssef", lastName: "Mancini", sex: "M", birth: "2014-03-23", birthPlace: "MAROCCO", nationality: "MAROCCO", notes: "Intolleranza al lattosio" },
    ],
    payments: [{ amount: 90, method: "CONTANTI", daysAgo: 3, notes: "Acconto" }],
  },

  // --- CANCELLED: esclusa dal bilancio (pagamento presumibilmente rimborsato) ---
  {
    lastName: "Barbieri", firstName: "Nadia", phone: "349 3344556", email: "nadia.barbieri@example.it",
    street: "Via Cavour 26", postalCode: "09100", city: "Cagliari",
    status: "CANCELLED", createdDaysAgo: 21,
    kids: [
      { firstName: "Alice", lastName: "Barbieri", sex: "F", birth: "2013-11-27", birthPlace: "Cagliari", nationality: "ITALIA" },
    ],
    payments: [{ amount: 50, method: "CONTANTI", daysAgo: 20, notes: "Acconto poi rimborsato" }],
  },

  // --- Stranieri: cittadinanza e luogo di nascita esteri ---
  {
    lastName: "Fontana", firstName: "Mihai", phone: "347 5566001", email: "mihai.fontana@example.it",
    street: "Via Torino 140", postalCode: "10123", city: "Torino",
    status: "CONFIRMED", createdDaysAgo: 16,
    kids: [
      { firstName: "Elena", lastName: "Fontana", sex: "F", birth: "2013-02-10", birthPlace: "ROMANIA", nationality: "ROMANIA" },
      { firstName: "Ioan", lastName: "Fontana", sex: "M", birth: "2015-05-15", birthPlace: "ROMANIA", nationality: "ROMANIA" },
    ],
    payments: [{ amount: 200, method: "BONIFICO", daysAgo: 15, notes: "Acconto" }],
  },
  {
    lastName: "Galli", firstName: "Carmen", phone: "338 8765432", email: "carmen.galli@example.it",
    street: "Carrer de Mallorca 210", postalCode: "08011", city: "Barcelona",
    status: "CONFIRMED", createdDaysAgo: 14,
    adult: { sex: "F", birth: "1986-09-21", birthPlace: "SPAGNA", nationality: "SPAGNA" },
    kids: [
      { firstName: "Pablo", lastName: "Galli", sex: "M", birth: "2014-06-30", birthPlace: "SPAGNA", nationality: "SPAGNA" },
    ],
    payments: [{ amount: 340, method: "BONIFICO", daysAgo: 13, notes: "Quota completa" }],
  },
  {
    lastName: "Villa", firstName: "Jennifer", phone: "345 1290384", email: "jennifer.villa@example.it",
    street: "Viale America 501", postalCode: "30100", city: "Venezia",
    status: "CONFIRMED", createdDaysAgo: 10,
    kids: [
      { firstName: "Emily", lastName: "Villa", sex: "F", birth: "2012-10-12", birthPlace: "STATI UNITI D'AMERICA", nationality: "STATI UNITI D'AMERICA" },
      { firstName: "James", lastName: "Villa", sex: "M", birth: "2015-01-04", birthPlace: "STATI UNITI D'AMERICA", nationality: "STATI UNITI D'AMERICA" },
    ],
    payments: [{ amount: 340, method: "CARTA", daysAgo: 9 }],
  },
];

const inverno2026: DemoRegistration[] = [
  {
    lastName: "Serra", firstName: "Gianni", phone: "340 6543210", email: "gianni.serra@example.it",
    street: "Via Roma 3", postalCode: "07100", city: "Sassari",
    status: "CONFIRMED", createdDaysAgo: 40,
    kids: [
      { firstName: "Nicole", lastName: "Serra", sex: "F", birth: "2014-09-09", birthPlace: "Sassari", nationality: "ITALIA" },
    ],
    payments: [{ amount: 120, method: "CONTANTI", daysAgo: 38, notes: "Quota completa" }],
  },
  {
    lastName: "Rinaldi", firstName: "Beatrice", phone: "343 7654321", email: "beatrice.rinaldi@example.it",
    street: "Via IV Novembre 17", postalCode: "61121", city: "Pesaro",
    status: "PENDING", createdDaysAgo: 35,
    kids: [
      { firstName: "Alessia", lastName: "Rinaldi", sex: "F", birth: "2013-03-03", birthPlace: "Pesaro", nationality: "ITALIA" },
      { firstName: "Vittoria", lastName: "Rinaldi", sex: "F", birth: "2015-12-25", birthPlace: "Pesaro", nationality: "ITALIA" },
    ],
    payments: [],
  },
  {
    lastName: "Testa", firstName: "Ugo", phone: "336 9876543", email: "ugo.testa@example.it",
    street: "Corso Vittorio 99", postalCode: "86100", city: "Campobasso",
    status: "CONFIRMED", createdDaysAgo: 33,
    adult: { sex: "M", birth: "1980-07-07", birthPlace: "Campobasso", nationality: "ITALIA" },
    kids: [
      { firstName: "Diego", lastName: "Testa", sex: "M", birth: "2014-05-20", birthPlace: "Campobasso", nationality: "ITALIA" },
    ],
    payments: [
      { amount: 20, method: "SCONTO", daysAgo: 31, notes: "Sconto early booking" },
      { amount: 200, method: "BONIFICO", daysAgo: 30 },
    ],
  },
  {
    lastName: "Longo", firstName: "Silvia", phone: "334 1593575", email: "silvia.longo@example.it",
    street: "Via Trieste 60", postalCode: "38121", city: "Trento",
    status: "CANCELLED", createdDaysAgo: 28,
    kids: [
      { firstName: "Nicola", lastName: "Longo", sex: "M", birth: "2013-08-15", birthPlace: "Trento", nationality: "ITALIA" },
    ],
    payments: [],
  },
];

// ------------------------------------------------------------------- spese

interface DemoExpense { title: string; category: string; amount: number; daysAgo: number; notes?: string }
interface DemoIncome { title: string; source: string; amount: number; daysAgo: number; notes?: string }

const speseEstivo: DemoExpense[] = [
  { title: "Spesa alimentare settimana 1", category: "CIBO", amount: 850.5, daysAgo: 20, notes: "Fornitore locale" },
  { title: "Spesa alimentare settimana 2", category: "CIBO", amount: 780, daysAgo: 8 },
  { title: "Pullman andata/ritorno", category: "TRASPORTI", amount: 600, daysAgo: 18 },
  { title: "Affitto struttura", category: "STRUTTURA", amount: 1500, daysAgo: 22, notes: "Fattura n. 118" },
  { title: "Materiali laboratori", category: "MATERIALI", amount: 230.4, daysAgo: 12 },
  { title: "Animatore sportivo", category: "PERSONALE", amount: 900, daysAgo: 6 },
  { title: "Cassetta farmaci", category: "GENERALE", amount: 45.9, daysAgo: 4 },
];

const entrateEstivo: DemoIncome[] = [
  { title: "Contributo parrocchia S. Maria", source: "CONTRIBUTO", amount: 500, daysAgo: 15 },
  { title: "Donazione famiglia Rossi", source: "DONAZIONE", amount: 200, daysAgo: 10, notes: "Gentile offerta" },
  { title: "Sovvenzione Comune", source: "SOVENZIONE", amount: 300, daysAgo: 7 },
];

const speseInverno: DemoExpense[] = [
  { title: "Affitto rifugio", category: "STRUTTURA", amount: 400, daysAgo: 30 },
];

const entrateInverno: DemoIncome[] = [
  { title: "Donazione circolo ACLI", source: "DONAZIONE", amount: 150, daysAgo: 28 },
];

// -------------------------------------------------------------------- main

async function main() {
  // 1. Pulizia: solo ciò che appartiene agli eventi demo.
  const oldEvents = await prisma.event.findMany({
    where: { name: { in: DEMO_EVENT_NAMES } },
    select: { id: true },
  });
  if (oldEvents.length > 0) {
    const ids = oldEvents.map((e) => e.id);
    // Le cascade su Registration → Participant/Payment e le delete esplicite
    // su Expense/Income seguono le relazioni dello schema.
    await prisma.registration.deleteMany({ where: { eventId: { in: ids } } });
    await prisma.expense.deleteMany({ where: { eventId: { in: ids } } });
    await prisma.income.deleteMany({ where: { eventId: { in: ids } } });
    await prisma.event.deleteMany({ where: { id: { in: ids } } });
    console.log(`Pulizia: rimossi ${oldEvents.length} eventi demo precedenti e dati collegati.`);
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("Nessun utente ADMIN trovato: esegui prima `npm run db:seed`.");
  // Narrowing: binding dopo il guard, così resta valido nelle closure sotto.
  const adminId = admin.id;

  // 2. Eventi demo.
  const estivo = await prisma.event.create({
    data: {
      name: "Camp Estivo 2026",
      year: 2026,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-12"),
      location: "Poggio Ubertini",
      participantLimit: 40,
      priceAdult: 150,
      priceKid1: 190,
      priceKid2: 150,
      priceKid3: 100,
      priceKid4Plus: 0,
      rules: "Regolamento del camp estivo: rispetto degli orari, divieto di uscite non autorizzate, uso responsabile degli spazi comuni.",
    },
  });

  const inverno = await prisma.event.create({
    data: {
      name: "Camp Inverno 2026",
      year: 2026,
      startDate: new Date("2026-01-02"),
      endDate: new Date("2026-01-07"),
      location: "Rifugio Monte Nero",
      participantLimit: null,
      priceAdult: 100,
      priceKid1: 120,
      priceKid2: 90,
      priceKid3: 60,
      priceKid4Plus: 0,
      rules: "",
    },
  });

  // 3. Iscrizioni con partecipanti e pagamenti.
  // Permanenza = durata evento (clamp 1–30), come la calcola l'API reale.
  const stayDaysFor = (ev: { startDate: Date; endDate: Date }) =>
    Math.min(
      30,
      Math.max(
        1,
        Math.round((ev.endDate.getTime() - ev.startDate.getTime()) / 86_400_000) + 1,
      ),
    );

  async function seedRegistrations(specs: DemoRegistration[], eventId: string, eventName: string, stayDays: number) {
    for (const spec of specs) {
      const createdAt = daysAgo(spec.createdDaysAgo);

      const participantData = [
        ...(spec.adult
          ? [{
              role: "ADULT",
              firstName: spec.firstName,
              lastName: spec.lastName,
              birthDate: spec.adult.birth,
              taxId: fakeCf(spec.lastName, spec.firstName, spec.adult.sex === "M", spec.adult.birth),
              nationality: spec.adult.nationality,
              birthPlace: spec.adult.birthPlace,
              sex: spec.adult.sex,
              notes: spec.adult.notes ?? "",
            }]
          : []),
        ...spec.kids.map((k) => ({
          role: "KID" as const,
          firstName: k.firstName,
          lastName: k.lastName,
          birthDate: k.birth,
          taxId: fakeCf(k.lastName, k.firstName, k.sex === "M", k.birth),
          nationality: k.nationality,
          birthPlace: k.birthPlace,
          sex: k.sex,
          notes: k.notes ?? "",
        })),
      ];

      const paymentData = spec.payments.map((p) => ({
        amount: p.amount,
        paid: true,
        paymentMethod: p.method,
        paymentDate: daysAgo(p.daysAgo),
        recordedById: adminId,
        notes: p.notes ?? "",
      }));

      await prisma.registration.create({
        data: {
          eventId,
          sottoscrittoFirstName: spec.firstName,
          sottoscrittoLastName: spec.lastName,
          sottoscrittoTaxId: fakeCf(spec.lastName, spec.firstName, true, "1985-01-01"),
          sottoscrittoPhone: spec.phone,
          sottoscrittoEmail: spec.email,
          street: spec.street,
          postalCode: spec.postalCode,
          city: spec.city,
          status: spec.status,
          notes: "",
          createdAt,
          updatedAt: createdAt,
          privacyConsent: true,
          rulesConsent: true,
          privacyConsentAt: createdAt,
          privacyPolicyVersion: CURRENT_PRIVACY_POLICY_VERSION,
          uploadToken: randomBytes(32).toString("hex"),
          stayDays,
          participants: { create: participantData },
          payments: { create: paymentData },
        },
      });
    }
    console.log(`  ${eventName}: ${specs.length} iscrizioni create.`);
  }

  await seedRegistrations(estivo2026, estivo.id, estivo.name, stayDaysFor(estivo));
  await seedRegistrations(inverno2026, inverno.id, inverno.name, stayDaysFor(inverno));

  // 4. Spese e entrate (per il Bilancio).
  await prisma.expense.createMany({
    data: speseEstivo.map(({ daysAgo: d, ...s }) => ({ ...s, date: daysAgo(d), eventId: estivo.id })),
  });
  await prisma.income.createMany({
    data: entrateEstivo.map(({ daysAgo: d, ...s }) => ({ ...s, date: daysAgo(d), eventId: estivo.id })),
  });
  await prisma.expense.createMany({
    data: speseInverno.map(({ daysAgo: d, ...s }) => ({ ...s, date: daysAgo(d), eventId: inverno.id })),
  });
  await prisma.income.createMany({
    data: entrateInverno.map(({ daysAgo: d, ...s }) => ({ ...s, date: daysAgo(d), eventId: inverno.id })),
  });
  console.log(`  Spese: ${speseEstivo.length + speseInverno.length}, entrate extra: ${entrateEstivo.length + entrateInverno.length}.`);

  // 5. Riepilogo atteso del Bilancio per evento (per controllare la demo).
  for (const ev of [estivo, inverno]) {
    const regs = await prisma.registration.findMany({
      where: { eventId: ev.id },
      include: { participants: true, payments: true },
    });
    const incomeRows = regs.map((r) =>
      computeRegistrationIncome(
        r.eventId,
        r.status,
        ev,
        r.participants.filter((p) => p.role === "ADULT").length,
        r.participants.length - r.participants.filter((p) => p.role === "ADULT").length,
        r.payments
      )
    );
    const expenses = await prisma.expense.findMany({ where: { eventId: ev.id } });
    const incomes = await prisma.income.findMany({ where: { eventId: ev.id } });
    const b = computeCampBalance(incomeRows, expenses, incomes);
    console.log(
      `\nBilancio atteso — ${ev.name}:\n` +
        `  quote incassate ${formatEuro(b.participantIncome)} · altre entrate ${formatEuro(b.otherIncome)} · uscite ${formatEuro(b.totalExpenses)}\n` +
        `  → saldo ${formatEuro(b.balance)} · ancora da incassare ${formatEuro(b.outstanding)}`
    );
  }

  console.log("\nSeed demo completato. Demo rieseguibile con: npm run db:seed:demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
