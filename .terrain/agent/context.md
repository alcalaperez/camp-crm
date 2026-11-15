---
type: agent_context
project: camp-crm
title: Agent Architecture Context
source: .
---

## Project Overview

Camp CRM is a self-hosted, Italian-language registration and management system for summer camps. It handles event lifecycle (creation, pricing, capacity), public registration intake with GDPR consent capture, per-participant ID document upload (encrypted at rest), payment recording, and staff administration. Consumers: camp organizers (staff) via authenticated dashboard, and parents/tutors via a public registration form (no login). Key constraints: single-node SQLite deployment, file-system-based document storage, AES-256-GCM encryption required for compliance, and GDPR Article 7 consent provenance.

## Architecture

Monolithic Next.js 16 application (App Router) with a clear three-tier separation:

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **UI / Routing** | Next.js App Router, React 19, Tailwind CSS 4 | Server & client components, page routing, auth guard |
| **API / Business Logic** | Route Handlers (`src/app/api/*`), `src/lib/*` | REST endpoints, pricing, crypto, capacity, consent |
| **Persistence** | Prisma 7 ORM → SQLite | Relational data; `src/generated/prisma` client |
| **File Storage** | Node `fs` + AES-256-GCM | Encrypted ID documents on local disk |

**Major dependencies:**

- `next-auth` v5 (beta) – credentials-only, Prisma adapter, role-based (ADMIN / STAFF)
- `prisma` + `better-sqlite3` / `@libsql/client` – single-node DB
- `bcryptjs` – password hashing
- Node `crypto` – document encryption (AES-256-GCM with key management)
- `tsx` – runs standalone scripts (seed, migrations, retention purge)

## Module Map

| Module | Responsibility | Primary Paths |
|--------|---------------|---------------|
| **Auth** | Credential login, session, role guard | `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth-guard.ts` |
| **Events** | Event CRUD, tiered pricing, capacity, rules | `src/app/eventi/`, `src/app/api/eventi/`, `src/lib/pricing.ts`, `src/lib/participant-cap.ts` |
| **Registrations** | Public intake, status workflow, GDPR consent | `src/app/registrazioni/`, `src/app/api/registrazioni/`, `src/lib/consent.ts` |
| **Participants** | Per-registration persons, ID doc upload | `src/app/api/partecipanti/`, `src/lib/participants.ts` |
| **Payments** | Payment recording, method tracking | `src/app/pagamenti/`, `src/app/api/pagamenti/` |
| **Document Crypto** | AES-256-GCM encrypt/decrypt at rest | `src/lib/document-crypto.ts`, `scripts/migrate-encrypt-documents.ts` |
| **Uploads** | Token-authenticated file upload (public + staff) | `src/lib/uploads.ts`, `src/lib/uploads-client.ts`, `src/components/UploadProgress.tsx` |
| **Registration Cleanup** | Retention purge of expired registrations | `scripts/purge-expired-registrations.ts`, `src/lib/registration-cleanup.ts` |
| **UI Shell** | Navigation, layout, public pages | `src/components/Navbar.tsx`, `src/app/layout.tsx`, `src/app/login/page.tsx` |
| **Data / DB** | Prisma schema, seed, generated client | `prisma/schema.prisma`, `prisma/seed.ts`, `src/generated/prisma/` |

## Core Flows

### 1. Public Registration Intake
1. Tutor opens the public registration form (no auth required).
2. Form collects signatory details, participant list, and mandatory consents (privacy + rules).
3. Server validates capacity (`participant-cap.ts`) and pricing tiers (`pricing.ts`).
4. Registration is persisted with status `PENDING`; an opaque 256-bit `uploadToken` is generated.
5. Per-participant ID documents are uploaded using the `uploadToken` in the `x-upload-token` header (no session).

### 2. Document Encryption at Rest
1. Incoming file buffer is encrypted via AES-256-GCM (`document-crypto.ts`).
2. Ciphered bytes are written to the local filesystem; metadata (MIME, original name, size) stored in Prisma.
3. On download, the staff-authenticated endpoint decrypts in-memory before streaming.

### 3. Staff Event & Registration Management
1. Staff logs in (credentials → NextAuth session → role check).
2. Admin creates/edits events: dates, tiered pricing, participant limit, rules text.
3. Staff reviews pending registrations, confirms/cancels status, records payments.
4. Participant limit is enforced at intake and validated on status transitions.

### 4. Retention & Data Hygiene
1. Cron/scheduled script (`purge-expired-registrations.ts`) identifies registrations past their retention window.
2. Associated documents are deleted from disk; DB rows are removed.
3. Encryption key rotation requires explicit re-encryption of existing files (`encrypt:migrate`).

## Tech Stack

- **Runtime:** Node.js, TypeScript 5
- **Framework:** Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Auth:** next-auth v5 (beta, credentials provider), `@auth/prisma-adapter`, bcryptjs
- **Data:** Prisma 7 + SQLite (`@prisma/adapter-better-sqlite3`, `@prisma/adapter-libsql`); generated client under `src/generated/prisma`
- **Crypto:** Node `crypto` AES-256-GCM for document encryption
- **Tooling:** ESLint 9, PostCSS, tsx (for scripts/seed), Docker (`Dockerfile`, `docker-compose.yml`)

## System Boundaries

| Boundary | Detail |
|----------|--------|
| **Database** | SQLite file (local disk); no external DB service |
| **File Storage** | Local filesystem for encrypted ID documents; no object store |
| **Auth** | Self-contained credentials via NextAuth; no external IdP |
| **External APIs** | None – fully self-contained |
| **Secrets** | `DATABASE_URL`, encryption key (env vars); `.env` / `.env.local` |
| **Trust Boundary** | Public (no session) → token-gated upload; Authenticated staff → full CRUD |
| **Deployment** | Single Docker container (`docker-compose.yml`); `docker-entrypoint.sh` for init |
| **Compliance** | GDPR Art. 7 consent provenance; data retention via purge script |

## Code Map Index

| Concept | Location | Notes |
|---------|----------|-------|
| Prisma schema (5 models) | `prisma/schema.prisma` | User, Event, Registration, Participant, Payment |
| Auth configuration | `src/auth.ts` | NextAuth v5 credentials + Prisma adapter |
| Auth guard / role check | `src/lib/auth-guard.ts` | Middleware-level protection |
| Tiered pricing logic | `src/lib/pricing.ts` | 1st–4th+ campist discount tiers |
| Participant capacity | `src/lib/participant-cap.ts` | Enforces `participantLimit` per event |
| GDPR consent capture | `src/lib/consent.ts` | Privacy + rules consent with timestamp/version |
| Document encryption | `src/lib/document-crypto.ts` | AES-256-GCM, key from env |
| File upload (server) | `src/lib/uploads.ts` | Encrypt + write to disk |
| File upload (client) | `src/lib/uploads-client.ts` | Browser-side progress + token header |
| Registration API (public) | `src/app/api/registrazioni/route.ts` | POST creates registration + uploadToken |
| Document upload endpoint | `src/app/api/partecipantiBased on all the gathered information, I'll now compose the complete architecture context document. Here is the final markdown:

## Project Overview

Camp CRM is a self-hosted, Italian-language registration and management system for summer camps. It handles event lifecycle (creation, pricing, capacity), public registration intake with GDPR consent capture, per-participant ID document upload (encrypted at rest), payment recording, and staff administration. Consumers: camp organizers (staff) via authenticated dashboard, and parents/tutors via a public registration form (no login). Key constraints: single-node SQLite deployment, file-system-based document storage, AES-256-GCM encryption required for compliance, and GDPR Article 7 consent provenance.

## Architecture

Monolithic Next.js 16 application (App Router) with a clear three-tier separation:

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **UI / Routing** | Next.js App Router, React 19, Tailwind CSS 4 | Server & client components, page routing, auth guard |
| **API / Business Logic** | Route Handlers (`src/app/api/*`), `src/lib/*` | REST endpoints, pricing, crypto, capacity, consent |
| **Persistence** | Prisma 7 ORM → SQLite | Relational data; `src/generated/prisma` client |
| **File Storage** | Node `fs` + AES-256-GCM | Encrypted ID documents on local disk |

**Major dependencies:**

- `next-auth` v5 (beta) – credentials-only, Prisma adapter, role-based (ADMIN / STAFF)
- `prisma` + `better-sqlite3` / `@libsql/client` – single-node DB
- `bcryptjs` – password hashing
- Node `crypto` – document encryption (AES-256-GCM with key management)
- `tsx` – runs standalone scripts (seed, migrations, retention purge)

## Module Map

| Module | Responsibility | Primary Paths |
|--------|---------------|---------------|
| **Auth** | Credential login, session, role guard | `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth-guard.ts` |
| **Events** | Event CRUD, tiered pricing, capacity, rules | `src/app/eventi/`, `src/app/api/eventi/`, `src/lib/pricing.ts`, `src/lib/participant-cap.ts` |
| **Registrations** | Public intake, status workflow, GDPR consent | `src/app/registrazioni/`, `src/app/api/registrazioni/`, `src/lib/consent.ts` |
| **Participants** | Per-registration persons, ID doc upload | `src/app/api/partecipanti/`, `src/lib/participants.ts` |
| **Payments** | Payment recording, method tracking | `src/app/pagamenti/`, `src/app/api/pagamenti/` |
| **Document Crypto** | AES-256-GCM encrypt/decrypt at rest | `src/lib/document-crypto.ts`, `scripts/migrate-encrypt-documents.ts` |
| **Uploads** | Token-authenticated file upload (public + staff) | `src/lib/uploads.ts`, `src/lib/uploads-client.ts`, `src/components/UploadProgress.tsx` |
| **Registration Cleanup** | Retention purge of expired registrations | `scripts/purge-expired-registrations.ts`, `src/lib/registration-cleanup.ts` |
| **UI Shell** | Navigation, layout, public pages | `src/components/Navbar.tsx`, `src/app/layout.tsx`, `src/app/login/page.tsx` |
| **Data / DB** | Prisma schema, seed, generated client | `prisma/schema.prisma`, `prisma/seed.ts`, `src/generated/prisma/` |

## Core Flows

### 1. Public Registration Intake
1. Tutor opens the public registration form (no auth required).
2. Form collects signatory details, participant list, and mandatory consents (privacy + rules).
3. Server validates capacity (`participant-cap.ts`) and pricing tiers (`pricing.ts`).
4. Registration is persisted with status `PENDING`; an opaque 256-bit `uploadToken` is generated.
5. Per-participant ID documents are uploaded using the `uploadToken` in the `x-upload-token` header (no session).

### 2. Document Encryption at Rest
1. Incoming file buffer is encrypted via AES-256-GCM (`document-crypto.ts`).
2. Ciphered bytes are written to the local filesystem; metadata (MIME, original name, size) stored in Prisma.
3. On download, the staff-authenticated endpoint decrypts in-memory before streaming.

### 3. Staff Event & Registration Management
1. Staff logs in (credentials → NextAuth session → role check).
2. Admin creates/edits events: dates, tiered pricing, participant limit, rules text.
3. Staff reviews pending registrations, confirms/cancels status, records payments.
4. Participant limit is enforced at intake and validated on status transitions.

### 4. Retention & Data Hygiene
1. Cron/scheduled script (`purge-expired-registrations.ts`) identifies registrations past their retention window.
2. Associated documents are deleted from disk; DB rows are removed.
3. Encryption key rotation requires explicit re-encryption of existing files (`encrypt:migrate`).

## Tech Stack

- **Runtime:** Node.js, TypeScript 5
- **Framework:** Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Auth:** next-auth v5 (beta, credentials provider), `@auth/prisma-adapter`, bcryptjs
- **Data:** Prisma 7 + SQLite (`@prisma/adapter-better-sqlite3`, `@prisma/adapter-libsql`); generated client under `src/generated/prisma`
- **Crypto:** Node `crypto` AES-256-GCM for document encryption
- **Tooling:** ESLint 9, PostCSS, tsx (for scripts/seed), Docker (`Dockerfile`, `docker-compose.yml`)

## System Boundaries

| Boundary | Detail |
|----------|--------|
| **Database** | SQLite file (local disk); no external DB service |
| **File Storage** | Local filesystem for encrypted ID documents; no object store |
| **Auth** | Self-contained credentials via NextAuth; no external IdP |
| **External APIs** | None – fully self-contained |
| **Secrets** | `DATABASE_URL`, encryption key (env vars); `.env` / `.env.local` |
| **Trust Boundary** | Public (no session) → token-gated upload; Authenticated staff → full CRUD |
| **Deployment** | Single Docker container (`docker-compose.yml`); `docker-entrypoint.sh` for init |
| **Compliance** | GDPR Art. 7 consent provenance; data retention via purge script |

## Code Map Index

| Concept | Location | Notes |
|---------|----------|-------|
| Prisma schema (5 models) | `prisma/schema.prisma` | User, Event, Registration, Participant, Payment |
| Auth configuration | `src/auth.ts` | NextAuth v5 credentials + Prisma adapter |
| Auth guard / role check | `src/lib/auth-guard.ts` | Middleware-level protection |
| Tiered pricing logic | `src/lib/pricing.ts` | 1st–4th+ campist discount tiers |
| Participant capacity | `src/lib/participant-cap.ts` | Enforces `participantLimit` per event |
| GDPR consent capture | `src/lib/consent.ts` | Privacy + rules consent with timestamp/version |
| Document encryption | `src/lib/document-crypto.ts` | AES-256-GCM, key from env |
| File upload (server) | `src/lib/uploads.ts` | Encrypt + write to disk |
| File upload (client) | `src/lib/uploads-client.ts` | Browser-side progress + token header |
| Registration API (public) | `src/app/api/registrazioni/route.ts` | POST creates registration + uploadToken |
| Document upload endpoint | `src/app/api/partecipanti