# Stage 1: Dipendenze e build
FROM node:24-slim AS builder

# Strumenti per compilare better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia i file delle dipendenze
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/
COPY prisma/migrations/ ./prisma/migrations/
COPY prisma.config.ts ./

# Installa TUTTE le dipendenze (serve prisma per generare il client)
RUN npm ci

# Genera il client Prisma
RUN npx prisma generate

# Copia il resto del codice sorgente
COPY . .

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Runtime di produzione
FROM node:24-slim AS runner

# Librerie runtime per better-sqlite3 e Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crea utente non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia TUTTI i node_modules (contiene tsx, prisma, bcrypt, better-sqlite3, ecc.)
COPY --from=builder /app/node_modules ./node_modules

# Copia il build standalone di Next.js (contiene server.js e la sua node_modules minimale)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copia il client Prisma generato
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

# Copia prisma schema, migrations, config, package.json (per migrate e seed)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/package.json ./

# Entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Directory per il database SQLite
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV DATABASE_URL="file:./data/dev.db"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
