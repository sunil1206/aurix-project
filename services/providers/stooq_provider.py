"""
Aurix - stooq.com gold price provider.

Stooq publishes free, public CSV endpoints. No API key, no rate limits
that we've ever hit, no captcha. Two endpoints we use:

    Spot quote:   https://stooq.com/q/l/?s=xaueur&i=d&f=sd2t2ohlcv&h&e=csv
    Historical:   https://stooq.com/q/d/l/?s=xaueur&d1=YYYYMMDD&d2=YYYYMMDD&i=d

Returns price in EUR per troy ounce; this provider converts to per-gram
to match the rest of the pipeline.

Why stooq over investing.com? Investing.com requires JavaScript-rendered
scraping behind a Cloudflare token rotation; that's brittle and against
their ToS. Stooq is a stable, well-known free data source used by the
Polish stock exchange and many quant projects.
"""
from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timezone
from decimal import Decimal

import httpx
from django.conf import settings

from apps.core.exceptions import PriceUnavailable

logger = logging.getLogger("aurix.price.stooq")

TROY_OUNCE_GRAMS = Decimal(settings.AURIX["TROY_OUNCE_GRAMS"])

QUOTE_URL = "https://stooq.com/q/l/"
SYMBOL_XAU_EUR = "xaueur"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Aurix/1.0)"}


def fetch() -> dict:
    """Returns a serialisable dict matching GoldSpot.to_dict()."""
    params = {
        "s": SYMBOL_XAU_EUR,
        "i": "d",
        "f": "sd2t2ohlcv",
        "h": "",
        "e": "csv",
    }

    try:
        with httpx.Client(timeout=8.0, headers=HEADERS) as client:
            resp = client.get(QUOTE_URL, params=params)
            resp.raise_for_status()
            text = resp.text
    except httpx.HTTPError as exc:
        raise PriceUnavailable(
            message="stooq.com is unreachable.",
            details={"provider": "stooq", "error": str(exc)},
        ) from exc

    eur_per_oz = _parse_quote(text)
    if eur_per_oz is None or eur_per_oz <= 0:
        raise PriceUnavailable(
            message="stooq returned an unparseable quote.",
            details={"provider": "stooq", "body_preview": text[:200]},
        )

    eur_per_gram = (eur_per_oz / TROY_OUNCE_GRAMS).quantize(Decimal("0.0001"))
    logger.info("stooq XAUEUR: %s EUR/oz -> %s EUR/g", eur_per_oz, eur_per_gram)
    return {
        "price_eur_per_gram": str(eur_per_gram),
        "source": "stooq",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def _parse_quote(text: str):
    """
    Stooq quote CSV format (first row is the header):
        Symbol,Date,Time,Open,High,Low,Close,Volume
        XAUEUR,2026-05-06,17:30:00,2380.50,2391.00,2378.20,2385.40,0

    Returns Decimal(close_price_eur_per_oz) or None.
    """
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        close = row.get("Close") or row.get("close")
        if close and close not in ("N/D", "N/A", "-"):
            try:
                return Decimal(close.strip())
            except Exception:
                pass
    return None
