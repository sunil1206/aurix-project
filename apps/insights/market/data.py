"""
Aurix - Historical price data fetcher.

Fallback chain (each step independent and cached):
    1. stooq.com CSV       (free, no key, daily bars going back 20+ years)
    2. yfinance XAUEUR=X   (Yahoo direct EUR quote)
    3. yfinance GC=F + EURUSD=X (futures + FX)
    4. yfinance XAUUSD=X + EURUSD=X (spot USD + FX)
    5. yfinance IAU/GLD ETFs + FX (most liquid daily series)

Cached in Redis for 5 min per (period, interval). On a hard total
failure the orchestrator returns its `_insufficient_data_response`.
"""
from __future__ import annotations

import csv
import io
import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import List, Optional

import httpx
from django.core.cache import cache

logger = logging.getLogger("aurix.market.data")

CACHE_KEY_TEMPLATE = "aurix:market:closes:{period}:{interval}"
CACHE_TTL_SECONDS = 300

STOOQ_CSV_URL = "https://stooq.com/q/d/l/"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Aurix/1.0)"}

# yfinance ticker constants.
T_XAU_EUR = "XAUEUR" + "=X"
T_XAU_USD = "XAUUSD" + "=X"
T_GC      = "GC"     + "=F"
T_EURUSD  = "EURUSD" + "=X"
T_IAU     = "IAU"
T_GLD     = "GLD"
IAU_OZ_PER_SHARE = 0.01
GLD_OZ_PER_SHARE = 0.10


@dataclass(frozen=True)
class PriceSeries:
    closes: List[float]
    period: str
    interval: str
    source: str = "stooq"
    ticker_used: str = ""

    def is_sufficient(self, min_points: int) -> bool:
        return len(self.closes) >= min_points


def get_close_prices(period: str = "3y", interval: str = "1d") -> PriceSeries:
    cache_key = CACHE_KEY_TEMPLATE.format(period=period, interval=interval)
    cached = cache.get(cache_key)
    if cached:
        return PriceSeries(
            closes=cached["closes"],
            period=period,
            interval=interval,
            source=cached.get("source", "cache"),
            ticker_used=cached.get("ticker_used", ""),
        )

    closes, source, ticker = _fetch_with_fallbacks(period, interval)
    cache.set(
        cache_key,
        {"closes": closes, "source": source, "ticker_used": ticker},
        timeout=CACHE_TTL_SECONDS,
    )
    return PriceSeries(closes=closes, period=period, interval=interval,
                       source=source, ticker_used=ticker)


# ---------------------------------------------------------------------------
# Fallback chain
# ---------------------------------------------------------------------------

def _fetch_with_fallbacks(period: str, interval: str):
    """Returns (closes, source, ticker_used)."""

    # 1. stooq.com (preferred — most reliable, no auth)
    closes = _stooq_xaueur(period, interval)
    if closes:
        logger.info("stooq XAUEUR: %d closes", len(closes))
        return closes, "stooq", "xaueur"

    # 2-5. yfinance fallback
    closes, ticker = _yfinance_chain(period, interval)
    if closes:
        return closes, "yfinance", ticker

    logger.error("All price routes failed for %s/%s", period, interval)
    return [], "none", ""


# ---------------------------------------------------------------------------
# stooq
# ---------------------------------------------------------------------------

def _stooq_xaueur(period: str, interval: str) -> List[float]:
    """
    Pull closing prices from stooq.com.
    period maps to a date range; interval maps to stooq's i= param.
    """
    today = date.today()
    days = _period_to_days(period)
    if not days:
        return []

    start = today - timedelta(days=days)
    params = {
        "s": "xaueur",
        "d1": start.strftime("%Y%m%d"),
        "d2": today.strftime("%Y%m%d"),
        "i": _interval_to_stooq(interval),
    }

    try:
        with httpx.Client(timeout=15.0, headers=HEADERS) as client:
            resp = client.get(STOOQ_CSV_URL, params=params)
            resp.raise_for_status()
            text = resp.text
    except httpx.HTTPError as exc:
        logger.warning("stooq fetch failed: %s", exc)
        return []

    return _parse_stooq_csv(text)


def _parse_stooq_csv(text: str) -> List[float]:
    """
    Stooq daily CSV:
        Date,Open,High,Low,Close,Volume
        2023-05-08,2010.50,2025.10,2008.40,2018.30,0
        ...
    """
    closes: List[float] = []
    if not text or text.lower().startswith("no data"):
        return closes
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        c = row.get("Close") or row.get("close")
        if not c or c in ("N/D", "N/A", "-"):
            continue
        try:
            closes.append(float(c))
        except ValueError:
            continue
    return closes


def _period_to_days(period: str) -> int:
    """Convert e.g. '3y', '6mo', '60d' to a day count."""
    period = period.strip().lower()
    if period.endswith("d"):
        return int(period[:-1] or 0)
    if period.endswith("mo"):
        return int(period[:-2] or 0) * 30
    if period.endswith("y"):
        return int(period[:-1] or 0) * 365
    if period.endswith("wk"):
        return int(period[:-2] or 0) * 7
    return 365  # safe default


def _interval_to_stooq(interval: str) -> str:
    interval = interval.lower()
    if interval == "1d": return "d"
    if interval == "1wk": return "w"
    if interval == "1mo": return "m"
    return "d"


# ---------------------------------------------------------------------------
# yfinance chain
# ---------------------------------------------------------------------------

def _yfinance_chain(period: str, interval: str):
    try:
        import yfinance as yf
    except Exception as exc:
        logger.warning("yfinance unavailable: %s", exc)
        return [], ""

    closes = _hist_closes(yf, T_XAU_EUR, period, interval)
    if closes:
        logger.info("yfinance XAUEUR: %d closes", len(closes))
        return closes, T_XAU_EUR

    fx = _hist_closes(yf, T_EURUSD, period, interval)
    if not fx:
        return [], ""

    def to_eur_per_oz(usd_series, scale=1.0):
        if not usd_series:
            return None
        n = min(len(usd_series), len(fx))
        return [
            float(usd_series[-n + i]) * scale / float(fx[-n + i]) if fx[-n + i] else 0.0
            for i in range(n)
        ]

    for sym, scale in [(T_GC, 1.0), (T_XAU_USD, 1.0),
                       (T_IAU, 1.0 / IAU_OZ_PER_SHARE),
                       (T_GLD, 1.0 / GLD_OZ_PER_SHARE)]:
        s = _hist_closes(yf, sym, period, interval)
        if s:
            out = to_eur_per_oz(s, scale)
            if out:
                logger.info("yfinance %s + EURUSD: %d closes", sym, len(out))
                return out, f"{sym}+{T_EURUSD}"

    return [], ""


def _hist_closes(yf, ticker: str, period: str, interval: str) -> List[float]:
    try:
        hist = yf.Ticker(ticker).history(
            period=period, interval=interval, auto_adjust=False, prepost=False,
        )
        if hist is None or hist.empty:
            return []
        return [float(x) for x in hist["Close"].dropna().tolist()]
    except Exception as exc:
        logger.warning("yfinance %s failed: %s", ticker, exc)
        return []
