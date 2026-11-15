import Link from "next/link";
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  retentionMonths,
  dataControllerName,
  dataControllerEmail,
} from "@/lib/consent";

export const metadata = {
  title: "Informativa privacy",
};

/**
 * Informativa privacy (GDPR, art. 13). Pagina pubblica: raggiungibile senza
 * login dal link nel modulo di iscrizione. La versione e i parametri dinamici
 * (titolare, conservazione) sono centralizzati in src/lib/consent.ts.
 */
export default function PrivacyPage() {
  const controller = dataControllerName();
  const email = dataControllerEmail();
  const months = retentionMonths();
  const today = new Date().toLocaleDateString("it-IT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-zinc-800">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-emerald-700 hover:underline"
        >
          ← Torna alla home
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900 mb-1">
        Informativa sul trattamento dei dati personali
      </h1>
      <p className="text-xs text-zinc-500 mb-8">
        Versione {CURRENT_PRIVACY_POLICY_VERSION} · aggiornata il {today}
      </p>

      <div className="space-y-6 text-sm leading-relaxed">
        <Section title="1. Titolare del trattamento">
          <p>
            Il titolare del trattamento dei Suoi dati personali è{" "}
            <strong>{controller}</strong>. Per qualsiasi richiesta relativa ai
            Suoi dati può scrivere a: <a href={`mailto:${email}`} className="text-emerald-700 hover:underline">{email}</a>.
          </p>
        </Section>

        <Section title="2. Tipologie di dati trattati">
          <p>Il trattamento riguarda i seguenti dati personali:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>dati anagrafici e di contatto (nome, cognome, data di nascita, codice fiscale, indirizzo, telefono, e-mail);</li>
            <li>copie di documenti d’identità (immagini/PDF), conservati <strong>cifrati</strong>;</li>
            <li>dati di partecipazione all’evento (ruolo, note organizzative fornite dal partecipante);</li>
            <li>dati di pagamento necessari alla gestione contabile.</li>
          </ul>
        </Section>

        <Section title="3. Finalità e base giuridica del trattamento">
          <p>
            I dati sono trattati per: gestire l’iscrizione e la partecipazione
            al camp estivo, organizzare logisticamente l’evento, gestire i
            pagamenti e adempiere a obblighi di legge.
          </p>
          <p className="mt-2">
            La base giuridica è l’<strong>esecuzione di un contratto / di
            misure precontrattuali</strong> (art. 6 lett. b) su Sua richiesta,
            nonché il <strong>consenso</strong> da Lei prestato con la
            spunta dell’informativa (art. 6 lett. a). Gli obblighi di legge
            (es. fatturazione) si fondano su altrettanti obblighi legali.
          </p>
        </Section>

        <Section title="4. Conservazione dei dati (periodo di retention)">
          <p>
            I Suoi dati sono conservati per <strong>{months} mesi</strong> dal
            termine dell’evento, al fine di gestire eventuali contestazioni,
            resi contabili e adempimenti normativi. Trascorso tale periodo i
            dati e i relativi documenti vengono eliminati automaticamente.
          </p>
        </Section>

        <Section title="5. Destinatari dei dati">
          <p>
            I dati sono accessibili esclusivamente al personale autorizzato
            (amministratori e operatori del camp) e sono ospitati su
            infrastruttura del fornitore di hosting. Non è prevista la
            comunicazione dei dati a terzi per finalità di marketing, né la
            loro vendita.
          </p>
        </Section>

        <Section title="6. Diritti dell’interessato">
          <p>
            In qualità di interessato, ha diritto di: accedere ai Suoi dati
            (art. 15), ottenerne la rettifica (art. 16), la cancellazione
            (art. 17), la limitazione del trattamento (art. 18), la portabilità
            (art. 20) e di opporti al trattamento (art. 21). Può revocare il
            consenso in qualsiasi momento senza pregiudicare la liceità del
            trattamento già effettuato.
          </p>
          <p className="mt-2">
            Per esercitare i Suoi diritti scriva a{" "}
            <a href={`mailto:${email}`} className="text-emerald-700 hover:underline">{email}</a>.
          </p>
        </Section>

        <Section title="7. Reclamo all’autorità">
          <p>
            Ha inoltre diritto di proporre reclamo al Garante per la protezione
            dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">www.garanteprivacy.it</a>).
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-zinc-900 mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
