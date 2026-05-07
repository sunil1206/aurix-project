"""
Aurix - Gold price service.

Single entry point: get_current_price(). Cached via Redis (or locmem
in dev) for PRICE_CACHE_TTL_SECONDS seconds. Providers are pluggable
via the PRICE_PROVIDER env var.

    mock        : Deterministic configured price. Default for tests.
    yfinance    : Yahoo Finance via yfinance package. No API key.
    goldapi     : https://www.goldapi.io   (requires GOLDAPI_KEY)
    metalsdev   : https://metals.dev        (requires METALSDEV_KEY)

If the chosen provider fails, get_current_price raises PriceUnavailable.
The previous cached value is intentionally NOT returned on failure --
stale prices in a financial system can cause real losses.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal

import httpx
from django.conf import settings

from apps.core.exceptions import PriceUnavailable
from services.cache import get_or_set

logger = logging.getLogger("aurix.price")

TROY_OUNCE_GRAMS = Decimal(settings.AURIX["TROY_OUNCE_GRAMS"])


@dataclass(frozen=True)
class GoldSpot:
    """Immutable price snapshot returned to callers."""
    price_eur_per_gram: Decimal
    source: str
    fetched_at: datetime

    def to_dict(self) -> dict:
        return {
            "price_eur_per_gram": str(self.price_eur_per_gram),
            "source": self.source,
            "fetched_at": self.fetched_at.isoformat(),
        }


def get_current_price() -> GoldSpot:
    cache_key = settings.AURIX["PRICE_CACHE_KEY"]
    ttl = settings.AURIX["PRICE_CACHE_TTL_SECONDS"]

    cached = get_or_set(cache_key, _fetch_fresh_serializable, ttl_seconds=ttl)
    return GoldSpot(
        price_eur_per_gram=Decimal(cached["price_eur_per_gram"]),
        source=cached["source"],
        fetched_at=datetime.fromisoformat(cached["fetched_at"]),
    )


def _fetch_fresh_serializable() -> dict:
    """Returns a JSON-serialisable dict so the cache layer can store it."""
    provider = (settings.AURIX.get("PRICE_PROVIDER") or "mock").lower()

    try:
        if provider == "mock":
            return _provider_mock()
        if provider == "yfinance":
            from services.providers.yfinance_provider import fetch as yf_fetch
            return yf_fetch()
        if provider == "stooq":
            from services.providers.stooq_provider import fetch as stooq_fetch
            return stooq_fetch()
        if provider == "goldapi":
            return _provider_goldapi()
        if provider == "metalsdev":
            return _provider_metalsdev()
    except PriceUnavailable:
        raise
    except httpx.HTTPError as exc:
        logger.exception("Price provider %s failed: %s", provider, exc)
        raise PriceUnavailable(
            message=f"Upstream price feed '{provider}' is unreachable.",
            details={"provider": provider},
        ) from exc
    except Exception as exc:
        logger.exception("Price provider %s errored: %s", provider, exc)
        raise PriceUnavailable(
            message=f"Upstream price feed '{provider}' returned an error.",
            details={"provider": provider, "error": str(exc)},
        ) from exc

    raise PriceUnavailable(
        message=f"Unknown price provider '{provider}'.",
        details={"provider": provider},
    )


def _provider_mock() -> dict:
    return {
        "price_eur_per_gram": str(settings.AURIX["MOCK_GOLD_PRICE_EUR_PER_GRAM"]),
        "source": "mock",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def _provider_goldapi() -> dict:
    key = settings.AURIX.get("GOLDAPI_KEY")
    if not key:
        raise PriceUnavailable(
            message="GOLDAPI_KEY is not configured.",
            details={"provider": "goldapi"},
        )

    url = f"{settings.AURIX['GOLDAPI_BASE_URL']}/XAU/EUR"
    headers = {"x-access-token": key, "Content-Type": "application/json"}

    with httpx.Client(timeout=5.0) as client:
        resp = client.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    eur_per_oz = Decimal(str(data["price"]))
    eur_per_gram = (eur_per_oz / TROY_OUNCE_GRAMS).quantize(Decimal("0.0001"))

    return {
        "price_eur_per_gram": str(eur_per_gram),
        "source": "goldapi",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def _provider_metalsdev() -> dict:
    key = settings.AURIX.get("METALSDEV_KEY")
    if not key:
        raise PriceUnavailable(
            message="METALSDEV_KEY is not configured.",
            details={"provider": "metalsdev"},
        )

    url = "https://api.metals.dev/v1/latest"
    params = {"api_key": key, "currency": "EUR", "unit": "g"}

    with httpx.Client(timeout=5.0) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    eur_per_gram = Decimal(str(data["metals"]["gold"])).quantize(Decimal("0.0001"))

    return {
        "price_eur_per_gram": str(eur_per_gram),
        "source": "metalsdev",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
