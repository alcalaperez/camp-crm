import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">
        Non autorizzato
      </h1>
      <p className="text-sm text-zinc-600 mb-6">
        Non hai i permessi necessari per accedere a questa sezione. Questa
        azione è riservata agli amministratori.
      </p>
      <Link
        href="/"
        className="inline-block px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
      >
        Torna alla dashboard
      </Link>
    </div>
  );
}
