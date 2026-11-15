import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.expense.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Spesa non trovata." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
