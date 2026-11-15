import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Credenziali configurabili via env var (con valori di default).
  // Usate SOLO se l'utente non esiste già: il seed non sovrascrive righe
  // esistenti (upsert con update vuoto).
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@camp.it";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Amministratore";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  const staffEmail = process.env.SEED_STAFF_EMAIL ?? "staff@camp.it";
  const staffName = process.env.SEED_STAFF_NAME ?? "Operatore";
  const staffPassword = process.env.SEED_STAFF_PASSWORD ?? "staff123";

  // Crea utente admin
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      password: adminHash,
      role: "ADMIN",
    },
  });

  // Crea utente staff
  const staffHash = await bcrypt.hash(staffPassword, 12);
  await prisma.user.upsert({
    where: { email: staffEmail },
    update: {},
    create: {
      name: staffName,
      email: staffEmail,
      password: staffHash,
      role: "STAFF",
    },
  });

  console.log("Seed completato:");
  console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`  Staff: ${staffEmail} / ${staffPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
