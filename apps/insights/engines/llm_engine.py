"""
Aurix - LLM-backed insight engine.

Calls OpenAI's chat completions API with a strict JSON-only system prompt
and parses the result. If anything goes wrong — no API key, network error,
malformed JSON — we transparently fall back to the deterministic rule
engine so the endpoint never breaks.

This is the recommended pattern for AI features in production: the LLM
augments the deterministic baseline; it does not replace it.
"""
from __future__ import annotations

import json
import logging
from dataclasses import asdict
from decimal import Decimal

from django.conf import settings

from .base import BaseInsightEngine, Insight, UserMetrics
from .rule_engine import RuleInsightEngine

logger = logging.getLogger("aurix.insights.llm")

_SYSTEM_PROMPT = """\
You are a friendly, level-headed fintech advisor for a digital gold wallet.
You receive a JSON object with one user's recent trading metrics.
Return a SHORT, single-paragraph insight plus 2-3 bullet reasoning points.

Rules:
  - Output VALID JSON only, matching the schema below. No prose around it.
  - Never invent numbers. Only use values present in the metrics.
  - Keep the summary under 30 words.
  - Reasoning bullets should each be under 20 words.

Schema:
  {"summary": string, "reasoning": [string, ...]}
"""


class LLMInsightEngine(BaseInsightEngine):
    """OpenAI-backed engine with rule-engine fallback."""

    name = "llm"

    def __init__(self) -> None:
        self._fallback = RuleInsightEngine()

    def generate(self, metrics: UserMetrics) -> Insight:
        api_key = settings.AURIX.get("OPENAI_API_KEY")
        if not api_key:
            logger.info("OPENAI_API_KEY missing; falling back to rule engine.")
            return self._fallback.generate(metrics)

        try:
            payload = self._call_openai(api_key, metrics)
        except Exception as exc:
            logger.warning("LLM call failed (%s); falling back to rule engine.", exc)
            return self._fallback.generate(metrics)

        return Insight(
            summary=payload["summary"],
            reasoning=list(payload.get("reasoning", [])),
            engine=self.name,
        )

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _call_openai(self, api_key: str, metrics: UserMetrics) -> dict:
        # Imported lazily so the dependency is optional in environments
        # that don't enable the LLM engine.
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model=settings.AURIX.get("OPENAI_MODEL", "gpt-4o-mini"),
            response_format={"type": "json_object"},
            temperature=0.4,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(_serialize(metrics))},
            ],
        )

        raw = response.choices[0].message.content
        data = json.loads(raw)

        if "summary" not in data:
            raise ValueError("LLM response missing 'summary'.")
        return data


def _serialize(metrics: UserMetrics) -> dict:
    """Convert dataclass → JSON-safe dict (Decimals → strings)."""
    out = asdict(metrics)
    for k, v in list(out.items()):
        if isinstance(v, Decimal):
            out[k] = str(v)
        elif isinstance(v, list):
            out[k] = [str(x) if isinstance(x, Decimal) else x for x in v]
    if metrics.generated_at:
        out["generated_at"] = metrics.generated_at.isoformat()
    return out
