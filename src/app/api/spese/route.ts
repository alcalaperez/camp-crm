import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES } from "@/lib/bilancio";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const expenses = await prisma.expense.findMany({
    include: { event: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await request.json();

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Il titolo è obbligatorio." }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "L'importo deve essere un numero positivo." }, { status: 400 });
  }

  if (!body.eventId) {
    return NextResponse.json({ error: "L'evento è obbligatorio." }, { status: 400 });
  }

  const category =
    typeof body.category === "string" &&
    (EXPENSE_CATEGORIES as readonly string[]).includes(body.category)
      ? body.category
      : "GENERALE";

  const expense = await prisma.expense.create({
    data: {
      event: { connect: { id: body.eventId } },
      title,
      category,
      amount,
      date: body.date ? new Date(body.date) : new Date(),
      notes: body.notes ?? "",
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
