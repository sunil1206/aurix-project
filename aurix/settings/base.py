"""
Aurix - Base settings shared by every environment.

Environment-specific overrides live in development.py / production.py.
Twelve-factor: every secret or environment-coupled value is read via
python-decouple's `config()`, never hardcoded.
"""
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

# ------------------------------------------------------------------
# Paths
# ------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ------------------------------------------------------------------
# Core
# ------------------------------------------------------------------
SECRET_KEY = config("SECRET_KEY", default="insecure-dev-key-change-me")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="*", cast=Csv())

# ------------------------------------------------------------------
# Applications
# ------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
]

LOCAL_APPS = [
    "apps.core",
    "apps.users",
    "apps.wallets",
    "apps.transactions",
    "apps.insights",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ------------------------------------------------------------------
# Middleware
# ------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.RequestIDMiddleware",
]

ROOT_URLCONF = "aurix.urls"
WSGI_APPLICATION = "aurix.wsgi.application"
ASGI_APPLICATION = "aurix.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ------------------------------------------------------------------
# Auth
# ------------------------------------------------------------------
AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------------------------------------------
# Internationalization
# ------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------
# Static files
# ------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------
# DRF
# ------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.DefaultPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "30/min",
        "user": "120/min",
        "trade": "20/min",      # tighter bucket for buy/sell
    },
    "EXCEPTION_HANDLER": "apps.core.exceptions.aurix_exception_handler",
}

# ------------------------------------------------------------------
# JWT
# ------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TTL_MINUTES", default=30, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TTL_DAYS", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# ------------------------------------------------------------------
# CORS
# ------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173,http://localhost:3000",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True

# ------------------------------------------------------------------
# Aurix-specific config
# ------------------------------------------------------------------
AURIX = {
    # Initial gift on sign-up
    "INITIAL_EUR_BALANCE": "1000.00",

    # Price service
    "PRICE_PROVIDER": config("PRICE_PROVIDER", default="stooq"),
    "PRICE_CACHE_KEY": "aurix:price:xau_eur_per_gram",
    "PRICE_CACHE_TTL_SECONDS": config("PRICE_CACHE_TTL_SECONDS", default=60, cast=int),
    "MOCK_GOLD_PRICE_EUR_PER_GRAM": config(
        "MOCK_GOLD_PRICE_EUR_PER_GRAM", default="65.00"
    ),
    "GOLDAPI_KEY": config("GOLDAPI_KEY", default=""),
    "GOLDAPI_BASE_URL": config(
        "GOLDAPI_BASE_URL", default="https://www.goldapi.io/api"
    ),
    "METALSDEV_KEY": config("METALSDEV_KEY", default=""),

    # Insight engine
    "INSIGHT_ENGINE": config("INSIGHT_ENGINE", default="rule"),
    "OPENAI_API_KEY": config("OPENAI_API_KEY", default=""),
    "OPENAI_MODEL": config("OPENAI_MODEL", default="gpt-4o-mini"),

    # Decimal precision
    "TROY_OUNCE_GRAMS": "31.1034768",
}

# ------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "aurix": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
