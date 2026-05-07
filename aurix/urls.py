"""
Aurix - Project-level URL routing.

Every app exposes its routes via `apps.<name>.urls`. Keeping them out of
this file means new endpoints don't require a project-level edit.
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from services.price_service import get_current_price


def health(_request):
    """Liveness probe. Returns 200 when the process is up."""
    return JsonResponse({"status": "ok", "service": "aurix"})


def price(_request):
    """Public endpoint exposing the cached gold spot price."""
    spot = get_current_price()
    return JsonResponse({
        "currency": "EUR",
        "unit": "gram",
        "price": str(spot.price_eur_per_gram),
        "source": spot.source,
        "fetched_at": spot.fetched_at.isoformat(),
    })


urlpatterns = [
    path("admin/", admin.site.urls),

    # Ops
    path("api/health/", health, name="health"),
    path("api/price/", price, name="price"),

    # Domain
    path("api/auth/", include("apps.users.urls")),
    path("api/wallet/", include("apps.wallets.urls")),
    path("api/transactions/", include("apps.transactions.urls")),
    path("api/insights/", include("apps.insights.urls")),
]
