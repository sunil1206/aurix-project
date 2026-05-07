"""
Aurix - Market analysis orchestrator.

Pipeline:
    1. Fetch historical closes from yfinance (cached).
    2. Compute the indicator suite (rolled into a chart-friendly series).
    3. Generate a weighted technical signal.
    4. Pull macro sentiment with per-headline scores.
    5. Fuse technical + sentiment.
    6. LLM analyst (or rule-based fallback).
    7. Return a flat, JSON-serialisable dict containing everything the
       frontend needs to render the Pro Desk: series for charts,
       headlines for the news widget, indicators, signal and summary.
"""
from __future__ import annotations

import logging
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any, Dict

from .data import get_close_prices
from .indicators import (
    bollinger, ema, macd, momentum, rsi, sma, support_resistance, volatility,
)
from .llm_analyst import generate_trading_insight
from .sentiment import get_news_sentiment
from .series import build_chart_series
from .signals import combine_signals, generate_technical_signal

logger = logging.getLogger("aurix.market.orchestrator")

MIN_DATA_POINTS = 35


def get_full_insight(period: str = "3y", interval: str = "1d") -> Dict[str, Any]:
    """End-to-end market analysis. Always returns a dict."""
    series = get_close_prices(period=period, interval=interval)

    if not series.is_sufficient(MIN_DATA_POINTS):
        return _insufficient_data_response(series)

    closes = series.closes
    price = float(closes[-1])

    technical = _compute_technical_block(closes, price)
    chart_series = build_chart_series(closes, period=series.period, interval=series.interval)
    sentiment = get_news_sentiment(query="gold")

    tech_signal = generate_technical_signal(
        price=price,
        rsi_value=technical["rsi"],
        macd_value=technical["_macd_obj"],
        sma_20=technical["sma_20"],
        sma_50=technical["sma_50"],
        bollinger_value=technical["_boll_obj"],
        momentum_pct=technical["momentum"],
        volatility_value=technical["volatility"],
    )

    fused = combine_signals(tech_signal, sentiment.score)

    analyst_payload = {
        "price": price,
        "rsi": technical["rsi"],
        "macd": technical["macd"],
        "bollinger": technical["bollinger"],
        "sma_20": technical["sma_20"],
        "sma_50": technical["sma_50"],
        "momentum": technical["momentum"],
        "volatility": technical["volatility"],
        "sentiment_score": sentiment.score,
        "signal": fused.final_signal,
        "confidence": fused.confidence,
    }
    analyst = generate_trading_insight(analyst_payload)

    return {
        "signal": fused.final_signal,
        "confidence": fused.confidence,
        "action": analyst.action,
        "summary": analyst.summary,
        "stop_loss": analyst.stop_loss,
        "engine": analyst.engine,
        "fusion_explanation": fused.explanation,
        "technical_details": _strip_internals(technical),
        "technical_signal": {
            "signal": tech_signal.signal,
            "confidence": tech_signal.confidence,
            "score": tech_signal.score,
            "reasons": tech_signal.reasons,
        },
        "sentiment": {
            "score": sentiment.score,
            "label": sentiment.label,
            "headlines_analyzed": sentiment.headlines_analyzed,
            "engine": sentiment.engine,
            "headlines": [asdict(h) for h in sentiment.headlines],
        },
        "series": chart_series,
        "data": {
            "source": series.source,
            "period": series.period,
            "interval": series.interval,
            "points": len(closes),
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _compute_technical_block(closes, price):
    boll = bollinger(closes, window=20, k=2.0)
    macd_v = macd(closes, fast=12, slow=26, signal_period=9)
    sr = support_resistance(closes, window=20)
    return {
        "price": price,
        "rsi": rsi(closes, period=14),
        "sma_20": sma(closes, 20),
        "sma_50": sma(closes, 50),
        "ema_20": ema(closes, 20),
        "macd": asdict(macd_v) if macd_v else None,
        "bollinger": asdict(boll) if boll else None,
        "support_resistance": asdict(sr) if sr else None,
        "volatility": volatility(closes, window=20),
        "momentum": momentum(closes, window=10),
        "_macd_obj": macd_v,
        "_boll_obj": boll,
    }


def _strip_internals(block: dict) -> dict:
    return {k: v for k, v in block.items() if not k.startswith("_")}


def _insufficient_data_response(series) -> Dict[str, Any]:
    return {
        "signal": "NEUTRAL",
        "confidence": 0.0,
        "action": "WAIT",
        "summary": (
            f"Not enough historical data ({len(series.closes)} points) to "
            f"run a meaningful technical analysis."
        ),
        "stop_loss": "—",
        "engine": "fallback",
        "fusion_explanation": "Insufficient data.",
        "technical_details": {},
        "technical_signal": {
            "signal": "NEUTRAL", "confidence": 0.0, "score": 0.0, "reasons": [],
        },
        "sentiment": None,
        "series": [],
        "data": {
            "source": series.source,
            "period": series.period,
            "interval": series.interval,
            "points": len(series.closes),
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
