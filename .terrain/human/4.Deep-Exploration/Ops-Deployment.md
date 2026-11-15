# Ops & Deployment Domain

**Module paths:** `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, `prisma/seed.ts`, `scripts/migrate-encrypt-documents.ts`, `next.config.ts`
**Generated:** 2026-09-11 · **Importance:** 3/10 (generic domain)

---

## Overview

This module packages the application for a small self-hosted VPS. It has no business logic and no UI; its entire value is that a non-specialist can go from "a server with Docker" to "a running, migrated, seeded camp CRM" with two commands — and that the two maintenance chores the product legally requires (encrypting legacy documents, purging expired ones) exist as idempotent, rehearsed scripts.

The deployment philosophy matches the product's: one container, one database file, one uploads directory. The Docker build is two-stage (compile toolchain only in the builder; slim runtime as a non-root user), the entrypoint applies migrations and seeds baseline users on every boot (both operations are safely re-runnable), and an optional bind mount lets documents live on an external disk without touching the database volume.

---

## Components

Each artifact solves one operational concern; together they form the whole "how does this thing run" story.

| Component | File path | Core responsibility |
|---|---|---|
| Multi-stage build | `Dockerfile` | Stage 1: python3/build-essential for `better-sqlite3`, `prisma generate`, `next build` (standalone). Stage 2: node:22-slim, non-root `nextjs` user, copies full `node_modules` (runtime tools for entrypoint), standalone server, generated Prisma client, `prisma/` for migrations |
| Entrypoint | `docker-entrypoint.sh` | `npx prisma migrate deploy` → `npx tsx prisma/seed.ts` → `exec node server.js` — deploys are "pull and restart" |
| Compose stack | `docker-compose.yml` | Port 3000; named volume `camp-data` → `/app/data` (SQLite); commented recipe for bind-mounting an external disk to `/app/uploads` with `UPLOADS_DIR`; all environment variables; `restart: unless-stopped` |
| Seed | `prisma/seed.ts` | Upserts ADMIN + STAFF users; credentials overridable via `SEED_*` env vars; `update: {}` means existing users are never overwritten — safe on every boot |
| Encryption migration | `scripts/migrate-encrypt-documents.ts` | One-off, idempotent at-rest encryption of legacy plaintext documents; validates the key up front; per-file atomicity via temp file + rename; skips files already carrying the `CCLE` magic |
| Next config | `next.config.ts` | `output: "standalone"`; `serverExternalPackages: ["better-sqlite3"]` so the native SQLite module is never bundled by the build |

---

## Operational notes

**Why full `node_modules` in the runtime image?** The entrypoint runs `prisma migrate deploy` and `tsx prisma/seed.ts` at boot, and `bcryptjs`/`better-sqlite3` are native or tooling-heavy — copying the whole dependency tree trades image size for boot reliability, the right trade at this scale.

**Backup discipline.** A complete backup is the `camp-data` volume (the SQLite file) **plus** the uploads directory **plus** `DOCUMENT_ENCRYPTION_KEY` stored somewhere else entirely. The README is emphatic: losing the key irreversibly loses every document, because the encrypted envelopes are worthless without it.

**Boot sequence guarantees.** Because the entrypoint migrates before serving, a container never serves against a missing schema; because the seed upserts with an empty `update`, repeated boots never clobber operator-changed users. Changing seeded credentials on an existing database requires explicit action (deleting the volume or the rows) — also documented in the compose comments.

**Internet posture.** The container is internet-facing by design: the enrollment form and two public GET endpoints are the product. Everything else answers 401/403; the JSON API has no CORS, versioning or rate limiting and is not meant to be exposed beyond the origin.

---

## Interaction with other modules

| Interacting module | Direction | Interface | Notes |
|---|---|---|---|
| Document Handling | configures | `UPLOADS_DIR`, `DOCUMENT_ENCRYPTION_KEY` | Bind-mount recipe for external disks; key provisioning |
| Privacy & GDPR | hosts | cron for `retention:purge --execute` | The weekly purge is a deployment concern |
| Event Management | runs on | `DATABASE_URL` | SQLite path differs between local dev and container |
| Auth & RBAC | bootstraps | `prisma/seed.ts` users, `AUTH_SECRET` | First admin exists only because this module creates it |

---

## Implementation highlights

- **Idempotent everything**: migrate deploy, seed upserts, encryption migration and retention purge can all run repeatedly without harm — the whole deployment story is "re-run until green".
- **Per-file atomic encryption migration**: write to `<file>.encrypting.tmp`, then rename — an interrupted run leaves each file fully plaintext or fully encrypted, never half-written (`scripts/migrate-encrypt-documents.ts` L89-99).
- **Non-root runtime**: the container drops to a dedicated `nextjs` user before starting the server — a small hardening step that costs nothing.
- **Documented secrets**: every env var's purpose, default and failure mode is commented in `.env.example` and `docker-compose.yml`, including the one warning that matters most ("NON perderla o tutti i documenti diventano illeggibili").
