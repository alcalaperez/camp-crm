import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { Role } from "@/types/next-auth";

/**
 * Garantisce che ci sia una sessione valida (server component / route handler).
 * Reindirizza a /login se assente.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Garantisce una sessione con uno dei ruoli richiesti (server component).
 * - Nessuna sessione → redirect a /login.
 * - Sessione senza ruolo sufficiente → renderizza una pagina 403.
 */
export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  if (!roles.includes(session.user.role)) {
    // Forza il render di una pagina 403 (non un redirect).
    redirect(`/403`);
  }
  return session;
}

/**
 * Verifica il ruolo per una route API. Restituisce una risposta 401/403 da
 * restituire immediatamente in caso di mancanza, oppure `null` se autorizzato.
 *
 * Uso:
 *   const unauthorized = assertRole(await auth(), "ADMIN");
 *   if (unauthorized) return unauthorized;
 */
export function assertRole(
  session: { user?: { role?: Role } } | null,
  ...roles: Role[]
): NextResponse | null {
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const role = session.user.role;
  if (!role || !roles.includes(role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  return null;
}

/**
 * Come assertRole, ma ammette qualsiasi ruolo autenticato (ADMIN o STAFF).
 */
export function assertAuth(
  session: { user?: { role?: Role } } | null
): NextResponse | null {
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  return null;
}
