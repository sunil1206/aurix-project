"""
Aurix - Development settings.

Defaults to SQLite + locmem cache so a new contributor can `runserver`
without installing Postgres or Redis. Set DATABASE_URL / REDIS_URL in
.env to point at the Docker stack instead.
"""
from decouple import config

from .base import *  # noqa: F401,F403
from .base import BASE_DIR

DEBUG = True
ALLOWED_HOSTS = ["*"]

# --- Database ---------------------------------------------------------------
# Dev defaults to SQLite. To use Postgres locally, set DATABASE_URL in .env
# and switch DJANGO_SETTINGS_MODULE to aurix.settings.production.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# --- Cache ------------------------------------------------------------------
REDIS_URL = config("REDIS_URL", default="")
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "aurix-dev",
        }
    }

# --- Email (console backend) ------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
