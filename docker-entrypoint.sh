#!/bin/sh
set -e

echo "🏕️  Camp CRM — Avvio container"

# Esegui le migrazioni Prisma (crea tabelle se non esistono)
echo "📦 Esecuzione migrazioni database..."
npx prisma migrate deploy

# Esegui il seed (crea utenti e evento di default se non presenti)
echo "🌱 Esecuzione seed..."
npx tsx prisma/seed.ts

echo "✅ Avvio applicazione..."
exec "$@"
