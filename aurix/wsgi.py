"""WSGI entry point for Aurix (used by gunicorn in production)."""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aurix.settings.production")

application = get_wsgi_application()
