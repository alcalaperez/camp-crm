This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Seed del database

### Utenti dello staff (base)

```bash
npm run db:seed
```

Crea, **senza sovrascrivere righe esistenti**, i due utenti di servizio.
Credenziali e nomi sono configurabili via variabili d'ambiente:

| Variabile | Default |
|-----------|---------|
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `admin@camp.it` / `admin123` (ruolo ADMIN) |
| `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD` | `staff@camp.it` / `staff123` (ruolo STAFF) |

> In produzione cambia le password al primo avvio o imposta le env var prima
> del seed.

### Dati dimostrativi (demo)

```bash
npm run db:seed:demo        # locale
docker compose exec camp-crm npm run db:seed:demo   # dentro il container
```

Popola il CRM con un dataset vario pensato per demo e collaudo:

- **Camp Estivo 2026** (16 iscrizioni) e **Camp Inverno 2026** (4 iscrizioni),
  con prezzi a tier e limiti diversi tra i due eventi;
- stati misti (confermate / in attesa / annullate), famiglie da 1 a 5
  campisti, adulto accompagnatore, acconti con saldo dovuto, pagamenti in
  più tranche, sconti (metodo `SCONTO`);
- famiglie straniere (ROMANIA, SPAGNA, MAROCCO, STATI UNITI D'AMERICA) con
  cittadinanza e luogo di nascita coerenti con la scheda alloggiati;
- spese (cibo, trasporti, struttura, …) ed entrate extra (donazioni,
  contributi) per popolare la sezione **Bilancio**.

Caratteristiche importanti:

- **Idempotente e proprietario dei suoi dati:** a ogni run cancella e ricrea
  *solo* ciò che appartiene agli eventi "Camp Estivo 2026" e
  "Camp Inverno 2026" (iscrizioni, partecipanti, pagamenti, spese, entrate e
  gli eventi stessi). Eventi e iscrizioni con altri nomi **non vengono
  toccati**.
- Richiede almeno un utente ADMIN (esegui prima `npm run db:seed`).
- I codici fiscali generati sono plausibili ma **non validi** (solo demo);
  i documenti d'identità sono volutamente assenti, così si può mostrare il
  flusso di recupero documenti mancanti.
- Al termine stampa il bilancio atteso per ogni evento, utile per verificare
  che i numeri nella UI coincidano.

## Sicurezza dei documenti

I documenti d'identità caricati (PDF, immagini) vengono **cifrati a riposo** con
AES-256-GCM prima di essere scritti su disco. Su disco (e in qualsiasi
backup/snapshot) si trova quindi solo testo cifrato: senza la chiave di
cifratura il contenuto non è ricostruibili.

### Setup (obbligatorio prima di andare in produzione)

1. Genera una chiave a 256 bit:

   ```bash
   openssl rand -base64 32
   ```

2. Imposta il valore come variabile d'ambiente `DOCUMENT_ENCRYPTION_KEY`
   in `.env` alla radice del progetto (`docker-compose.yml` la interpola da
   lì o dall'ambiente della shell; in produzione puoi usare un Docker
   secret). La chiave **non** deve stare nel volume
   dei dati né nel repository git: conservala in un password manager o in un
   segreto off-site.

3. Se stai aggiornando un'installazione esistente che ha già documenti in
   chiaro su disco, esegui la migrazione **una tantum** (idempotente, può essere
   rieseguita senza danno):

   ```bash
   # locale
   npm run encrypt:migrate

   # oppure dentro il container
   docker compose exec camp-crm npm run encrypt:migrate
   ```

   La migrazione cifra ogni file non ancora cifrato e salta quelli già cifrati.
   È atomica per-file: un'interruzione lascia ogni file o tutto in chiaro o
   tutto cifrato.

### Avvertenze importanti

- **La perdita della chiave è irreversibile.** Senza `DOCUMENT_ENCRYPTION_KEY`
  nessun documento salvato può essere decifrato. Fai un backup della chiave in
  un luogo sicuro e separato dal backup dei dati.
- **Non cambiare la chiave su un DB già popolato** senza prima pianificare la
  decryption/re-encryption dei file esistenti (la migrazione attuale cifra
  solo i file in chiaro; per ruotare la chiave serve un'apposita procedura di
  re-encryption).
- Se la variabile non è impostata, il caricamento di nuovi documenti failisce
  in modo esplicito anziché scrivere in chiaro silenziosamente.

## Privacy e GDPR

L'app è pensata per un uso europeo/italiano e implementa alcune misure GDPR.

### Variabili d'ambiente

| Variabile | Scopo | Default |
|-----------|-------|---------|
| `DATA_CONTROLLER_NAME` | Titolare del trattamento, mostrato in `/privacy` | `[inserire ...]` |
| `DATA_CONTROLLER_EMAIL` | Contatto per i diritti dell'interessato | `[inserire ...]` |
| `RETENTION_MONTHS` | Mesi di conservazione dopo la fine dell'evento | `24` |

**Imposta `DATA_CONTROLLER_NAME` ed `EMAIL` prima di andare in produzione**
(senza, la pagina `/privacy` mostra dei placeholder non conformi).

### Controllo degli accessi (RBAC)

- **ADMIN**: gestione completa — eventi (crea/modifica/elimina), regolamento,
  iscrizioni, documenti, pagamenti.
- **STAFF**: operativo — iscrizioni, documenti, pagamenti. La pagina Eventi è
  **sola lettura** (non può creare/modificare/eliminare eventi).

> ⚠️ **Cambio comportamento:** prima di questa versione qualunque utente
> autenticato poteva creare/modificare/eliminare eventi. Ora è riservato a
> ADMIN. Se hai utenti STAFF che gestivano gli eventi, promuovili ad ADMIN.

### Informativa e consenso

- La pagina pubblica `/privacy` contiene l'informativa (art. 13). Il modulo di
  iscrizione la linka.
- Quando un utente si iscrive, oltre al flag `privacyConsent` vengono salvati
  `privacyConsentAt` (timestamp) e `privacyPolicyVersion` (versione accettata),
  come richiesto dall'art. 7.
- La versione corrente dell'informativa è definita in `src/lib/consent.ts`
  (`CURRENT_PRIVACY_POLICY_VERSION`). **Incrementala** ogni volta che modifichi
  sostanzialmente l'informativa.

### Conservazione dei dati (retention)

Lo script `npm run retention:purge` cancella le iscrizioni il cui evento è
terminato da più di `RETENTION_MONTHS`, inclusi i documenti cifrati su disco.

```bash
# Dry-run (default): mostra cosa cancellerebbe senza toccare nulla
npm run retention:purge

# Esecuzione reale (irreversibile) — pensata per un cron settimanale
npm run retention:purge -- --execute

# Dentro il container
docker compose exec camp-crm npm run retention:purge -- --execute
```

Lo script è idempotente. Per automatizzarlo in produzione, aggiungi un cron
sul VPS, ad esempio:

```cron
# Ogni lunedì alle 3:00
0 3 * * 1  cd /percorso/camp-crm && docker compose exec -T camp-crm npm run retention:purge -- --execute >> /var/log/camp-retention.log 2>&1
```

> **Cancella orfani:** eliminare un'iscrizione dalla dashboard ora rimuove
> anche i file dei documenti su disco (non rimangono più orfani).

### Limiti noti (non ancora implementati)

- **Dati sanitari:** il campo "Note" raccoglie anche allergie/terapie (dati
  ex art. 9), attualmente non gestiti con basi giuridiche dedicate. Da
  valutare se separarli o smettere di raccoglierli.
- **Log di audit:** non esiste ancora un registro di chi ha visto/modificato
  cosa (artt. 5(2), 30, 32).
- **Diritti dell'interessato:** non c'è ancora export automatico (art. 20) o
  cancellazione su richiesta (art. 17) via UI — vanno gestiti manualmente.
