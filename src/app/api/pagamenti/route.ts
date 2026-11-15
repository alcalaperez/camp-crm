import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const payments = await prisma.payment.findMany({
    include: {
      registration: { include: { event: true } },
      recordedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await request.json();

  const payment = await prisma.payment.create({
    data: {
      registration: { connect: { id: body.registrationId } },
      amount: body.amount,
      // I pagamenti sono sempre considerati pagati (non più in sospeso).
      paid: true,
      paymentMethod: body.paymentMethod ?? "CONTANTI",
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
      recordedBy: { connect: { id: session.user!.id! } },
      notes: body.notes ?? "",
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
