"""
Aurix - yfinance gold price provider.

Kept in its own module so the heavy import (`yfinance` pulls pandas)
only happens when this provider is actually selected.

Strategy:
    1. Try the direct EUR-quoted spot ticker.
    2. Fall back to gold futures (USD/oz) divided by the EUR-USD FX rate.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal

from django.conf import settings

from apps.core.exceptions import PriceUnavailable

logger = logging.getLogger("aurix.price.yfinance")

TROY_OUNCE_GRAMS = Decimal(settings.AURIX["TROY_OUNCE_GRAMS"])

# Tickers stored as constants. The "=X" / "=F" suffixes confuse some
# editors when written inline, so we keep them here.
TICKER_XAU_EUR = "XAUEUR" + "=" + "X"
TICKER_GC      = "GC" + "=" + "F"
TICKER_EURUSD  = "EURUSD" + "=" + "X"


def fetch():
    """Returns a serialisable dict matching GoldSpot.to_dict()."""
    import yfinance as yf

    eur_per_oz = _direct_quote(yf) or _via_fx(yf)
    if eur_per_oz is None or eur_per_oz <= 0:
        raise PriceUnavailable(
            message="yfinance returned no usable gold quote.",
            details={"provider": "yfinance"},
        )

    eur_per_gram = (eur_per_oz / TROY_OUNCE_GRAMS).quantize(Decimal("0.0001"))
    return {
        "price_eur_per_gram": str(eur_per_gram),
        "source": "yfinance",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def _direct_quote(yf):
    try:
        hist = yf.Ticker(TICKER_XAU_EUR).history(period="1d", interval="1m")
        if hist.empty:
            return None
        return Decimal(str(hist["Close"].iloc[-1]))
    except Exception as exc:
        logger.info("Direct EUR quote failed: %s", exc)
        return None


def _via_fx(yf):
    try:
        gc = yf.Ticker(TICKER_GC).history(period="1d", interval="1m")
        fx = yf.Ticker(TICKER_EURUSD).history(period="1d", interval="1m")
        if gc.empty or fx.empty:
            return None
        usd_per_oz = Decimal(str(gc["Close"].iloc[-1]))
        usd_per_eur = Decimal(str(fx["Close"].iloc[-1]))
        if usd_per_eur == 0:
            return None
        return usd_per_oz / usd_per_eur
    except Exception as exc:
        logger.info("FX fallback failed: %s", exc)
        return None
