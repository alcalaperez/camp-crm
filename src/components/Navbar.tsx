"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  if (pathname === "/login") return null;

  return (
    <nav className="bg-white border-b border-zinc-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/"
              className="text-base sm:text-lg font-bold text-emerald-700 mr-1 sm:mr-4 whitespace-nowrap"
            >
              🏕️ Camp CRM
            </Link>

            {/* Link pubblico — sempre visibile */}
            <Link
              href="/registrazioni/nuova"
              className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                pathname === "/registrazioni/nuova"
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
            >
              Iscriviti
            </Link>

            {/* Link riservati — solo se autenticato */}
            {session && (
              <>
                <Link
                  href="/registrazioni"
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    pathname === "/registrazioni"
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  Iscrizioni
                </Link>
                <Link
                  href="/pagamenti"
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    pathname === "/pagamenti"
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  Pagamenti
                </Link>
                <Link
                  href="/bilancio"
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    pathname === "/bilancio"
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  Bilancio
                </Link>
                <Link
                  href="/eventi"
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    pathname === "/eventi"
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  Eventi
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <>
                <span className="text-xs sm:text-sm text-zinc-500 hidden xs:inline sm:inline max-w-[8rem] truncate">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-xs sm:text-sm text-zinc-500 hover:text-red-600 transition-colors"
                >
                  Esci
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-xs sm:text-sm text-zinc-500 hover:text-emerald-700 transition-colors font-medium"
              >
                Accedi
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
