#!/usr/bin/env sh
# ============================================================
# Aurix - Container entrypoint
#
# Runs once per container start, BEFORE the main process.
# Steps are idempotent so a restart is always safe.
#
#   1. Wait for Postgres to accept connections (Python-based,
#      works in plain `sh` / `dash`, not just bash).
#   2. Apply database migrations.
#   3. Collect static files (production only; idempotent).
#   4. Hand off to the command passed as `CMD`.
# ============================================================
set -e

log() { printf '[entrypoint] %s\n' "$*"; }

# --- 1. Wait for Postgres ---------------------------------------------------
if [ -n "${DATABASE_URL:-}" ] && [ "${SKIP_DB_WAIT:-}" != "1" ]; then
  log "Waiting for database to accept connections..."
  python /app/scripts/wait_for_db.py || log "WARNING: DB wait failed; continuing anyway."
fi

# --- 2. Migrations ----------------------------------------------------------
if [ "${SKIP_MIGRATIONS:-}" != "1" ]; then
  log "Applying database migrations..."
  python manage.py migrate --noinput
fi

# --- 3. Static files (production only) --------------------------------------
if [ "${DJANGO_SETTINGS_MODULE:-}" = "aurix.settings.production" ]; then
  log "Collecting static files..."
  python manage.py collectstatic --noinput --clear >/dev/null
fi

# --- 4. Hand off ------------------------------------------------------------
log "Starting: $*"
exec "$@"
