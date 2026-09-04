#!/bin/sh
set -e

echo "[entrypoint] Blooming Beauty Skin API — starting up"
echo "[entrypoint] NODE_ENV=${NODE_ENV:-production}"

# ── 1. Apply pending database migrations (safe & idempotent) ──────────────
# Render can't run manual commands, so we do it here on every boot.
# prisma migrate deploy only applies migrations that haven't been applied yet.
if [ "${SKIP_MIGRATIONS}" != "true" ]; then
  echo "[entrypoint] Applying database migrations..."
  ( cd /app/apps/api && ./node_modules/.bin/prisma migrate deploy ) \
    || { echo "[entrypoint] ERROR: migrations failed"; exit 1; }
else
  echo "[entrypoint] Skipping migrations (SKIP_MIGRATIONS=true)"
fi

# ── 2. Optional seed on empty DB ──────────────────────────────────────────
# The seed script wipes & recreates data, so we ONLY run it when requested AND
# when the DB has no users yet. Safe to leave enabled on the first deploy.
if [ "${SEED_ON_STARTUP}" = "true" ]; then
  echo "[entrypoint] Checking whether the database needs seeding..."
  USER_COUNT="$(cd /app/apps/api && node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.user.count().then(c => { console.log(String(c)); return p.\$disconnect(); })
      .catch(e => { console.error(e.message); process.exit(1); });
  " 2>&1)"
  echo "[entrypoint] Existing users: ${USER_COUNT}"
  if [ "${USER_COUNT}" = "0" ]; then
    echo "[entrypoint] Seeding database (empty)..."
    ( cd /app/apps/api && ./node_modules/.bin/tsx src/prisma/seed.ts ) \
      || { echo "[entrypoint] ERROR: seed failed"; exit 1; }
  else
    echo "[entrypoint] Database already has data — skipping seed"
  fi
else
  echo "[entrypoint] Skipping seed (set SEED_ON_STARTUP=true to auto-seed an empty DB)"
fi

# ── 3. Start the API server ───────────────────────────────────────────────
echo "[entrypoint] Starting API server..."
exec node apps/api/dist/index.js