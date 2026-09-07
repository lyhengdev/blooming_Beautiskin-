#!/bin/sh
set -e

echo "[entrypoint] Blooming Beauty Skin API — starting up"
echo "[entrypoint] NODE_ENV=${NODE_ENV:-production}"

# ── 1. Apply schema (migrations if available, else db push) ────────────────
# Render can't run manual commands, so we do it here on every boot.
# - If the DB already has a migration history, apply pending migrations.
# - If the DB has tables but no migration table (created via `db push`), the
#   P3005 baseline error would abort migrate deploy — so use db push instead,
#   which reconciles the schema idempotently.
if [ "${SKIP_MIGRATIONS}" != "true" ]; then
  MIGRATIONS_TABLE="$(cd /app/apps/api && node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$queryRawUnsafe(\"SELECT to_regclass('_prisma_migrations') AS t\")
      .then(r => { console.log(r[0] && r[0].t ? 'yes' : 'no'); return p.\$disconnect(); })
      .catch(() => { console.log('unknown'); return p.\$disconnect(); });
  " 2>&1)"

  if [ "${MIGRATIONS_TABLE}" = "yes" ]; then
    echo "[entrypoint] Migration history found — applying migrations..."
    ( cd /app/apps/api && ./node_modules/.bin/prisma migrate deploy ) \
      || { echo "[entrypoint] ERROR: migrations failed"; exit 1; }
  else
    echo "[entrypoint] No migration history (existing schema DB) — syncing via prisma db push..."
    ( cd /app/apps/api && ./node_modules/.bin/prisma db push --skip-generate ) \
      || { echo "[entrypoint] ERROR: db push failed"; exit 1; }
  fi
else
  echo "[entrypoint] Skipping schema sync (SKIP_MIGRATIONS=true)"
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

# ── 3. Setup prod (safe upsert — creates/updates admin + home settings) ──
echo "[entrypoint] Running production setup (upsert admin & home settings)..."
( cd /app/apps/api && ./node_modules/.bin/tsx src/prisma/setup-prod.ts ) \
  || { echo "[entrypoint] WARNING: setup-prod failed (non-fatal, continuing)"; }

# ── 4. Start the API server (background, internal :4000) ───────────────────
echo "[entrypoint] Starting API server on :4000..."
cd /app
PORT=4000 node apps/api/dist/index.js &
API_PID=$!

# ── 5. Wait for the API to accept requests ─────────────────────────────────
echo "[entrypoint] Waiting for API health..."
API_READY=0
for i in $(seq 1 30); do
  if node -e "fetch('http://localhost:4000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" 2>/dev/null; then
    API_READY=1
    break
  fi
  sleep 1
done
[ "$API_READY" = "1" ] && echo "[entrypoint] API is up." || echo "[entrypoint] WARNING: API not healthy within timeout (check logs)."

# ── 6. Start the Next.js web server (foreground, public :3000) ──────────────
# If the API dies the entrypoint doesn't restart it; the container health check
# will catch it on Render. Next runs in the foreground so the container lives.
echo "[entrypoint] Starting Next.js web server on :3000..."
cd /app/apps/web
exec node_modules/.bin/next start -p 3000