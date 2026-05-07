"""
Aurix - Signal engine + signal fusion.

Pure functions over an indicator snapshot. No I/O, no DB, no LLM —
keeps the engine deterministic and unit-testable.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from .indicators import MACD, Bollinger


@dataclass(frozen=True)
class TechnicalSignal:
    signal: str           # "BULLISH" | "BEARISH" | "NEUTRAL"
    confidence: float     # 0.0 .. 1.0
    reasons: List[str] = field(default_factory=list)
    score: float = 0.0    # signed score before clamping (-1..+1)


# Per-rule weight contributing to the composite score in [-1, +1].
WEIGHTS = {
    "rsi_extreme":      0.30,
    "macd_crossover":   0.25,
    "macd_histogram":   0.10,
    "sma_trend":        0.15,
    "bollinger_band":   0.15,
    "momentum":         0.05,
}


def generate_technical_signal(
    *,
    price: float,
    rsi_value: Optional[float],
    macd_value: Optional[MACD],
    sma_20: Optional[float],
    sma_50: Optional[float],
    bollinger_value: Optional[Bollinger],
    momentum_pct: Optional[float],
    volatility_value: Optional[float],
) -> TechnicalSignal:
    """
    Combine indicators into a single weighted score, then map to a signal.

    Bullish contributions push the score toward +1; bearish toward -1.
    High realised volatility shrinks the final confidence (we're less
    sure of *anything* in a chaotic market).
    """
    score = 0.0
    reasons: List[str] = []

    # --- RSI: oversold / overbought ----------------------------------------
    if rsi_value is not None:
        if rsi_value < 30:
            score += WEIGHTS["rsi_extreme"]
            reasons.append(f"RSI {rsi_value:.1f} < 30 (oversold, bullish)")
        elif rsi_value > 70:
            score -= WEIGHTS["rsi_extreme"]
            reasons.append(f"RSI {rsi_value:.1f} > 70 (overbought, bearish)")

    # --- MACD --------------------------------------------------------------
    if macd_value is not None:
        if macd_value.crossover == "bullish_cross":
            score += WEIGHTS["macd_crossover"]
            reasons.append("MACD bullish crossover")
        elif macd_value.crossover == "bearish_cross":
            score -= WEIGHTS["macd_crossover"]
            reasons.append("MACD bearish crossover")
        # Even without a fresh cross, the histogram sign is a softer cue.
        if macd_value.histogram > 0:
            score += WEIGHTS["macd_histogram"]
        elif macd_value.histogram < 0:
            score -= WEIGHTS["macd_histogram"]

    # --- SMA20 vs SMA50: trend ---------------------------------------------
    if sma_20 is not None and sma_50 is not None:
        if sma_20 > sma_50:
            score += WEIGHTS["sma_trend"]
            reasons.append(f"SMA20 ({sma_20:.2f}) > SMA50 ({sma_50:.2f}): uptrend")
        elif sma_20 < sma_50:
            score -= WEIGHTS["sma_trend"]
            reasons.append(f"SMA20 ({sma_20:.2f}) < SMA50 ({sma_50:.2f}): downtrend")

    # --- Bollinger position -------------------------------------------------
    if bollinger_value is not None:
        if bollinger_value.position == "below_lower":
            score += WEIGHTS["bollinger_band"]
            reasons.append("Price below lower Bollinger Band (oversold)")
        elif bollinger_value.position == "above_upper":
            score -= WEIGHTS["bollinger_band"]
            reasons.append("Price above upper Bollinger Band (overbought)")

    # --- Momentum ----------------------------------------------------------
    if momentum_pct is not None:
        if momentum_pct > 2:
            score += WEIGHTS["momentum"]
            reasons.append(f"Positive momentum +{momentum_pct:.2f}%")
        elif momentum_pct < -2:
            score -= WEIGHTS["momentum"]
            reasons.append(f"Negative momentum {momentum_pct:.2f}%")

    # --- Map score → signal -----------------------------------------------
    if score > 0.15:
        signal = "BULLISH"
    elif score < -0.15:
        signal = "BEARISH"
    else:
        signal = "NEUTRAL"

    confidence = min(abs(score), 1.0)

    # High volatility erodes confidence (>40% annualised is "noisy gold").
    if volatility_value is not None and volatility_value > 0.4:
        confidence *= 0.7
        reasons.append(f"High volatility ({volatility_value:.2f} ann.) — reduced confidence")

    return TechnicalSignal(
        signal=signal,
        confidence=round(float(confidence), 3),
        reasons=reasons,
        score=round(float(score), 3),
    )


# ---------------------------------------------------------------------------
# Signal fusion: technicals + sentiment
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class FusedSignal:
    final_signal: str        # "BULLISH" | "BEARISH" | "NEUTRAL"
    confidence: float        # 0.0 .. 1.0
    explanation: str


def combine_signals(
    technical: TechnicalSignal,
    sentiment_score: Optional[float],
) -> FusedSignal:
    """
    Fuse a technical signal with a sentiment score in [-1, +1].

    Rules:
      - Aligned (same sign)            -> boost confidence.
      - Conflict                        -> shrink confidence.
      - Extreme sentiment (>0.7) and
        weak/neutral technical          -> sentiment overrides direction.
    """
    if sentiment_score is None:
        return FusedSignal(
            final_signal=technical.signal,
            confidence=technical.confidence,
            explanation="No sentiment data; using technicals only.",
        )

    tech_dir = _direction(technical.signal)
    sent_dir = _direction_from_score(sentiment_score)

    # Extreme sentiment override.
    if abs(sentiment_score) > 0.7 and technical.confidence < 0.3:
        signal = "BULLISH" if sentiment_score > 0 else "BEARISH"
        return FusedSignal(
            final_signal=signal,
            confidence=min(abs(sentiment_score), 1.0),
            explanation=(
                f"Sentiment is extreme ({sentiment_score:+.2f}) and technicals are weak "
                f"(conf {technical.confidence:.2f}); sentiment drives the call."
            ),
        )

    # Aligned vs conflicting.
    if tech_dir == sent_dir and tech_dir != 0:
        boosted = min(technical.confidence + 0.2 * abs(sentiment_score), 1.0)
        return FusedSignal(
            final_signal=technical.signal,
            confidence=round(boosted, 3),
            explanation=(
                f"Technicals and sentiment agree ({technical.signal.lower()}); "
                f"confidence boosted to {boosted:.2f}."
            ),
        )

    if tech_dir != 0 and sent_dir != 0 and tech_dir != sent_dir:
        damped = max(technical.confidence - 0.25, 0.0)
        return FusedSignal(
            final_signal="NEUTRAL" if damped < 0.2 else technical.signal,
            confidence=round(damped, 3),
            explanation=(
                f"Technicals say {technical.signal.lower()} but sentiment "
                f"({sentiment_score:+.2f}) disagrees; confidence cut to {damped:.2f}."
            ),
        )

    return FusedSignal(
        final_signal=technical.signal,
        confidence=technical.confidence,
        explanation="Sentiment is neutral; technicals stand.",
    )


def _direction(signal: str) -> int:
    return {"BULLISH": 1, "BEARISH": -1}.get(signal, 0)


def _direction_from_score(score: float) -> int:
    if score > 0.1:  return 1
    if score < -0.1: return -1
    return 0
