# ============================================================
# Aurix - Production container image
#
# Multi-stage build:
#   1. builder  - installs build tooling and Python deps
#   2. runtime  - slim image with only what gunicorn needs
#
# The container runs as an unprivileged user. Migrations and
# collectstatic run via entrypoint.sh on every start so a fresh
# DB or a code update never requires extra commands.
# ============================================================

# ---------- Stage 1: build ----------
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user -r requirements.txt

# ---------- Stage 2: runtime ----------
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/home/aurix/.local/bin:$PATH \
    DJANGO_SETTINGS_MODULE=aurix.settings.production

# Runtime libs only — libpq for psycopg, curl for the healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash aurix

USER aurix
WORKDIR /app

# Bring over installed Python packages from the builder stage.
COPY --from=builder --chown=aurix:aurix /root/.local /home/aurix/.local

# Copy the source last so code edits don't bust the dep-install cache.
COPY --chown=aurix:aurix . /app

# Entrypoint owns startup orchestration; CMD is the actual process.
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fs http://localhost:8000/api/health/ || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "aurix.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--threads", "2", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
