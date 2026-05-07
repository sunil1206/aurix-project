"""
Insight engines (strategy pattern).

Importing this package exposes the public engine factory:

    from apps.insights.engines import get_engine
    engine = get_engine()             # respects settings.AURIX["INSIGHT_ENGINE"]
    insight = engine.generate(metrics)
"""
from __future__ import annotations

from django.conf import settings

from .base import BaseInsightEngine, Insight, UserMetrics
from .llm_engine import LLMInsightEngine
from .rule_engine import RuleInsightEngine

__all__ = [
    "BaseInsightEngine",
    "Insight",
    "UserMetrics",
    "RuleInsightEngine",
    "LLMInsightEngine",
    "get_engine",
]


def get_engine() -> BaseInsightEngine:
    """Return the configured insight engine."""
    name = (settings.AURIX.get("INSIGHT_ENGINE") or "rule").lower()
    if name == "llm":
        return LLMInsightEngine()
    return RuleInsightEngine()
