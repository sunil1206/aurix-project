"""
Aurix - LLM analyst layer.

Wraps OpenAI's chat completions with a strict system prompt that forces
the model to behave like a conservative quant analyst. Always returns a
result; on any failure (no key, network error, malformed JSON) it falls
back to a deterministic rule-based summary so the endpoint stays alive.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from django.conf import settings

logger = logging.getLogger("aurix.market.llm")


SYSTEM_PROMPT = """\
You are an elite Quantitative Analyst and Risk Manager for Aurix Pro,
an institutional-grade digital gold trading platform. Your job: turn raw
indicators and a sentiment score into a tight executive summary for a
retail investor.

You will receive a JSON object with: price (XAU/EUR), rsi, macd
(macd/signal/histogram), bollinger (upper/middle/lower/position),
sma_20, sma_50, momentum, volatility, sentiment_score, signal,
confidence.

Rules:
  1. Summary must be at most 4 sentences.
  2. Clearly state whether momentum is BULLISH, BEARISH, or NEUTRAL.
  3. Recommend ONE of: BUY, SELL, HOLD, ACCUMULATE, WAIT.
  4. Suggest a concrete risk-management action (a stop-loss level
     anchored to the lower Bollinger band or a recent SMA).
  5. Reference only numbers present in the JSON. Do NOT invent.
  6. Tone: objective, analytical, professional.

Respond with valid JSON only:
{"summary": "...", "action": "BUY|SELL|HOLD|ACCUMULATE|WAIT", "stop_loss": "<number or short text>"}
"""


@dataclass(frozen=True)
class AnalystOutput:
    summary: str
    action: str
    stop_loss: str
    engine: str   # "openai" | "fallback"


def generate_trading_insight(data: dict) -> AnalystOutput:
    """
    Hand the indicator + signal payload to OpenAI. On any failure, fall
    back to a deterministic rule-based summary.
    """
    api_key = settings.AURIX.get("OPENAI_API_KEY")
    if not api_key:
        logger.info("OPENAI_API_KEY missing; using rule-based fallback.")
        return _rule_based_fallback(data)

    try:
        return _call_openai(api_key, data)
    except Exception as exc:
        logger.warning("OpenAI analyst failed (%s); using rule-based fallback.", exc)
        return _rule_based_fallback(data)


# ---------------------------------------------------------------------------
# OpenAI path
# ---------------------------------------------------------------------------

def _call_openai(api_key: str, data: dict) -> AnalystOutput:
    from openai import OpenAI  # lazy

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=settings.AURIX.get("OPENAI_MODEL", "gpt-4o-mini"),
        response_format={"type": "json_object"},
        temperature=0.3,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(data, default=str)},
        ],
    )

    raw = response.choices[0].message.content or "{}"
    parsed = json.loads(raw)
    return AnalystOutput(
        summary=str(parsed.get("summary", "")).strip(),
        action=str(parsed.get("action", "HOLD")).upper(),
        stop_loss=str(parsed.get("stop_loss", "—")),
        engine="openai",
    )


# ---------------------------------------------------------------------------
# Deterministic fallback
# ---------------------------------------------------------------------------

def _rule_based_fallback(data: dict) -> AnalystOutput:
    """Mirrors the LLM output shape using only the supplied numbers."""
    signal = str(data.get("signal", "NEUTRAL")).upper()
    confidence = float(data.get("confidence") or 0)
    price = data.get("price")
    boll = data.get("bollinger") or {}
    sma_50 = data.get("sma_50")

    action = _action_from_signal(signal, confidence)
    stop = _stop_loss(boll, sma_50)

    parts = [
        f"Composite signal is {signal} with {confidence:.0%} confidence."
    ]
    if data.get("rsi") is not None:
        parts.append(f"RSI sits at {float(data['rsi']):.1f}.")
    if price is not None and sma_50 is not None:
        parts.append(
            f"Price €{float(price):.2f}/g "
            f"{'above' if float(price) > float(sma_50) else 'below'} the SMA50 "
            f"of €{float(sma_50):.2f}."
        )
    parts.append(f"Recommended action: {action}; suggested stop-loss {stop}.")

    return AnalystOutput(
        summary=" ".join(parts),
        action=action,
        stop_loss=stop,
        engine="fallback",
    )


def _action_from_signal(signal: str, confidence: float) -> str:
    if signal == "BULLISH":
        return "BUY" if confidence >= 0.6 else "ACCUMULATE"
    if signal == "BEARISH":
        return "SELL" if confidence >= 0.6 else "WAIT"
    return "HOLD"


def _stop_loss(boll: dict, sma_50) -> str:
    if isinstance(boll, dict) and boll.get("lower") is not None:
        return f"€{float(boll['lower']):.2f} (lower Bollinger Band)"
    if sma_50 is not None:
        return f"€{float(sma_50):.2f} (SMA50)"
    return "set 2-3% below entry"
