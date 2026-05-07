"""ASGI entry point for Aurix (use with uvicorn / daphne for async)."""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aurix.settings.production")

application = get_asgi_application()
