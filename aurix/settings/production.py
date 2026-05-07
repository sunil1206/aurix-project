"""
Aurix - Production settings.

PostgreSQL + Redis are mandatory. Sentry is wired in if SENTRY_DSN is set.
Security headers default to safe values; override per-deployment if needed.
"""
import os
from urllib.parse import urlparse

from decouple import config

from .base import *  # noqa: F401,F403

DEBUG = False

# --- Database ---------------------------------------------------------------
def _parse_database_url(url: str) -> dict:
    """Minimal Postgres URL parser to avoid extra deps."""
    p = urlparse(url)
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": (p.path or "/").lstrip("/"),
        "USER": p.username or "",
        "PASSWORD": p.password or "",
        "HOST": p.hostname or "localhost",
        "PORT": str(p.port or 5432),
        "CONN_MAX_AGE": 60,
        "OPTIONS": {"connect_timeout": 5},
    }


DATABASES = {
    "default": _parse_database_url(
        config("DATABASE_URL", default="postgres://aurix:aurix@db:5432/aurix")
    )
}

# --- Cache (Redis) ----------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": config("REDIS_URL", default="redis://redis:6379/0"),
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "TIMEOUT": 300,
    }
}

# --- Security ---------------------------------------------------------------
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31_536_000      # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
X_FRAME_OPTIONS = "DENY"

# --- Observability ----------------------------------------------------------
SENTRY_DSN = config("SENTRY_DSN", default="")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment=os.environ.get("ENVIRONMENT", "production"),
    )
