"""
Aurix - Time-series helpers for charting.

Builds per-bar indicator values so the frontend can plot a real chart
without re-implementing TA on the client.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from statistics import mean, pstdev
from typing import List, Optional

from .indicators import _ema_series


def build_chart_series(closes: List[float], period: str, interval: str) -> List[dict]:
    """
    Returns one row per bar with:
        date, price, sma_20, upper_band, lower_band, rsi, macd, signal, histogram
    Pads with None where there isn't enough data yet.
    """
    n = len(closes)
    if n == 0:
        return []

    sma20 = _rolling_mean(closes, 20)
    upper, lower = _rolling_bbands(closes, 20, 2.0)
    rsi_series = _rolling_rsi(closes, 14)
    macd_line, sig_line, hist = _rolling_macd(closes, 12, 26, 9)

    dates = _back_dates(n, interval)

    out = []
    for i in range(n):
        out.append({
            "date":       dates[i],
            "price":      round(float(closes[i]), 4),
            "sma":        _round(sma20[i]),
            "upperBand":  _round(upper[i]),
            "lowerBand":  _round(lower[i]),
            "rsi":        _round(rsi_series[i], 2),
            "macd":       _round(macd_line[i], 4),
            "signal":     _round(sig_line[i], 4),
            "histogram":  _round(hist[i], 4),
        })
    return out


# ---------------------------------------------------------------------------

def _round(v, digits=2):
    return round(float(v), digits) if v is not None else None


def _back_dates(n: int, interval: str) -> List[str]:
    today = datetime.now(timezone.utc).date()
    if interval.endswith("d"):
        delta = timedelta(days=int(interval[:-1] or 1))
    elif interval.endswith("h"):
        delta = timedelta(hours=int(interval[:-1] or 1))
    else:
        delta = timedelta(days=1)
    out = [(today - (n - 1 - i) * delta).isoformat() for i in range(n)]
    return out


def _rolling_mean(prices, w):
    out = [None] * len(prices)
    for i in range(w - 1, len(prices)):
        out[i] = mean(prices[i - w + 1: i + 1])
    return out


def _rolling_bbands(prices, w, k):
    upper = [None] * len(prices)
    lower = [None] * len(prices)
    for i in range(w - 1, len(prices)):
        window = prices[i - w + 1: i + 1]
        m = mean(window)
        sd = pstdev(window)
        upper[i] = m + k * sd
        lower[i] = m - k * sd
    return upper, lower


def _rolling_rsi(prices, period=14):
    n = len(prices)
    out: List[Optional[float]] = [None] * n
    if n < period + 1:
        return out

    gains, losses = [0.0], [0.0]
    for i in range(1, n):
        ch = prices[i] - prices[i - 1]
        gains.append(max(ch, 0.0))
        losses.append(max(-ch, 0.0))

    avg_g = sum(gains[1:period + 1]) / period
    avg_l = sum(losses[1:period + 1]) / period
    out[period] = 100.0 if avg_l == 0 else 100.0 - 100.0 / (1.0 + avg_g / avg_l)

    for i in range(period + 1, n):
        avg_g = (avg_g * (period - 1) + gains[i]) / period
        avg_l = (avg_l * (period - 1) + losses[i]) / period
        out[i] = 100.0 if avg_l == 0 else 100.0 - 100.0 / (1.0 + avg_g / avg_l)
    return out


def _rolling_macd(prices, fast=12, slow=26, sig=9):
    n = len(prices)
    macd = [None] * n
    signal = [None] * n
    hist = [None] * n

    if n < slow + sig:
        return macd, signal, hist

    ema_f = _ema_series(prices, fast)
    ema_s = _ema_series(prices, slow)
    head = len(ema_f) - len(ema_s)
    ema_f = ema_f[head:]
    line = [f - s for f, s in zip(ema_f, ema_s)]
    sig_line = _ema_series(line, sig)

    line_aligned = line[-len(sig_line):]
    hist_vals = [m - s for m, s in zip(line_aligned, sig_line)]

    # Place the values at the tail of the n-length output.
    for i, val in enumerate(line_aligned):
        idx = n - len(line_aligned) + i
        macd[idx] = val
    for i, val in enumerate(sig_line):
        idx = n - len(sig_line) + i
        signal[idx] = val
    for i, val in enumerate(hist_vals):
        idx = n - len(hist_vals) + i
        hist[idx] = val

    return macd, signal, hist
