import Link from "next/link";

export default function GraziePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-10">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">
          Iscrizione inviata!
        </h1>
        <p className="text-zinc-500 mb-6 leading-relaxed">
          Grazie per esserti iscritto al camp estivo.
          <br />
          Riceverai una conferma all&apos;indirizzo email che hai fornito.
          <br />
          Per qualsiasi domanda, contattaci.
        </p>
        <Link
          href="/registrazioni/nuova"
          className="inline-flex px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
        >
          Nuova iscrizione
        </Link>
      </div>
    </div>
  );
}
