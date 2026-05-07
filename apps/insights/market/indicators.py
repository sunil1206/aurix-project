"""
Aurix - Pure-Python technical indicators.

All indicators take a list[float] of closing prices, oldest first, and
return either a single number, a list, or a small dataclass.

Why pure Python (with numpy where convenient)?
    - TA-Lib is heavy and a pain to install in containers.
    - These calculations are well-defined and easy to verify by hand.
    - It keeps the docker image small.
"""
from __future__ import annotations

from dataclasses import dataclass
from statistics import mean, pstdev
from typing import List, Optional, Sequence

import numpy as np


# ---------------------------------------------------------------------------
# Moving averages
# ---------------------------------------------------------------------------

def sma(prices: Sequence[float], window: int) -> Optional[float]:
    """Simple Moving Average over the last `window` closes."""
    if len(prices) < window or window <= 0:
        return None
    return float(mean(prices[-window:]))


def ema(prices: Sequence[float], window: int) -> Optional[float]:
    """
    Exponential Moving Average. Smoothing factor k = 2 / (window + 1).
    Seeded with the SMA of the first `window` values for numerical stability.
    """
    if len(prices) < window or window <= 0:
        return None
    k = 2.0 / (window + 1)
    e = float(mean(prices[:window]))
    for p in prices[window:]:
        e = p * k + e * (1 - k)
    return e


def _ema_series(prices: Sequence[float], window: int) -> List[float]:
    """Returns the full EMA series (one value per close, after the seed)."""
    if len(prices) < window:
        return []
    k = 2.0 / (window + 1)
    e = float(mean(prices[:window]))
    out = [e]
    for p in prices[window:]:
        e = p * k + e * (1 - k)
        out.append(e)
    return out


# ---------------------------------------------------------------------------
# RSI
# ---------------------------------------------------------------------------

def rsi(prices: Sequence[float], period: int = 14) -> Optional[float]:
    """
    Wilder's RSI on the last `period` closes.
    Returns a value in [0, 100] or None if not enough data.
    """
    if len(prices) < period + 1:
        return None

    gains, losses = [], []
    for i in range(1, len(prices)):
        change = prices[i] - prices[i - 1]
        gains.append(max(change, 0.0))
        losses.append(max(-change, 0.0))

    # Wilder's smoothing — seed with simple averages of the first `period`.
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    for g, l in zip(gains[period:], losses[period:]):
        avg_gain = (avg_gain * (period - 1) + g) / period
        avg_loss = (avg_loss * (period - 1) + l) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


# ---------------------------------------------------------------------------
# MACD
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class MACD:
    macd: float
    signal: float
    histogram: float
    crossover: str  # "bullish_cross" | "bearish_cross" | "none"


def macd(
    prices: Sequence[float],
    fast: int = 12,
    slow: int = 26,
    signal_period: int = 9,
) -> Optional[MACD]:
    """
    Standard MACD(12, 26, 9). Detects a cross by comparing the last two
    histogram values: positive -> negative is bearish, vice versa bullish.
    """
    if len(prices) < slow + signal_period:
        return None

    ema_fast = _ema_series(prices, fast)
    ema_slow = _ema_series(prices, slow)
    # Align: ema_fast is longer (started earlier), trim its head.
    head = len(ema_fast) - len(ema_slow)
    ema_fast = ema_fast[head:]
    macd_line = [f - s for f, s in zip(ema_fast, ema_slow)]

    signal_line = _ema_series(macd_line, signal_period)
    if not signal_line:
        return None

    macd_aligned = macd_line[-len(signal_line):]
    hist = [m - s for m, s in zip(macd_aligned, signal_line)]

    crossover = "none"
    if len(hist) >= 2:
        if hist[-2] <= 0 and hist[-1] > 0:
            crossover = "bullish_cross"
        elif hist[-2] >= 0 and hist[-1] < 0:
            crossover = "bearish_cross"

    return MACD(
        macd=float(macd_aligned[-1]),
        signal=float(signal_line[-1]),
        histogram=float(hist[-1]),
        crossover=crossover,
    )


# ---------------------------------------------------------------------------
# Bollinger Bands
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Bollinger:
    upper: float
    middle: float
    lower: float
    position: str  # "below_lower" | "above_upper" | "inside"
    pct_b: float   # 0 = lower band, 1 = upper band


def bollinger(prices: Sequence[float], window: int = 20, k: float = 2.0) -> Optional[Bollinger]:
    """20-period Bollinger Bands at +/- k standard deviations."""
    if len(prices) < window:
        return None
    window_slice = prices[-window:]
    mid = float(mean(window_slice))
    sd = float(pstdev(window_slice))
    upper = mid + k * sd
    lower = mid - k * sd

    last = float(prices[-1])
    if last < lower:
        position = "below_lower"
    elif last > upper:
        position = "above_upper"
    else:
        position = "inside"

    pct_b = (last - lower) / (upper - lower) if upper != lower else 0.5
    return Bollinger(upper=upper, middle=mid, lower=lower, position=position, pct_b=float(pct_b))


# ---------------------------------------------------------------------------
# Volatility / momentum / S&R
# ---------------------------------------------------------------------------

def volatility(prices: Sequence[float], window: int = 20) -> Optional[float]:
    """
    Annualised stddev of log returns over the window. Daily bars assumed
    (sqrt(252)). Returns a float in [0, 1+] roughly.
    """
    if len(prices) < window + 1:
        return None
    arr = np.asarray(prices[-(window + 1):], dtype=float)
    log_returns = np.diff(np.log(arr))
    return float(np.std(log_returns, ddof=1) * np.sqrt(252))


def momentum(prices: Sequence[float], window: int = 10) -> Optional[float]:
    """Percentage price change over the last `window` periods."""
    if len(prices) < window + 1:
        return None
    return float((prices[-1] - prices[-(window + 1)]) / prices[-(window + 1)] * 100)


@dataclass(frozen=True)
class SupportResistance:
    support: float
    resistance: float
    distance_to_support_pct: float
    distance_to_resistance_pct: float


def support_resistance(prices: Sequence[float], window: int = 20) -> Optional[SupportResistance]:
    """Recent min/max as crude support/resistance over the last `window` bars."""
    if len(prices) < window:
        return None
    window_slice = prices[-window:]
    last = float(prices[-1])
    sup = float(min(window_slice))
    res = float(max(window_slice))
    return SupportResistance(
        support=sup,
        resistance=res,
        distance_to_support_pct=float((last - sup) / last * 100) if last else 0.0,
        distance_to_resistance_pct=float((res - last) / last * 100) if last else 0.0,
    )
