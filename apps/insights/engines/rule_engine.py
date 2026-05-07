"""
Aurix - Rule-based insight engine.

Walks an ordered list of rules and returns the first match. Each rule is
a small predicate over `UserMetrics` plus a message factory. The order
matters — earlier rules are higher priority.

Adding a rule is a three-line change at the bottom of `_build_rules()`.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Callable

from .base import BaseInsightEngine, Insight, UserMetrics


@dataclass(frozen=True)
class _Rule:
    name: str
    matches: Callable[[UserMetrics], bool]
    render: Callable[[UserMetrics], tuple[str, list[str]]]


class RuleInsightEngine(BaseInsightEngine):
    """Deterministic, transparent insight generator."""

    name = "rule"

    def generate(self, m: UserMetrics) -> Insight:
        for rule in _build_rules():
            if rule.matches(m):
                summary, reasoning = rule.render(m)
                return Insight(summary=summary, reasoning=reasoning, engine=self.name)

        return Insight(
            summary="Your activity looks balanced. No notable patterns yet.",
            reasoning=[f"Only {m.total_trades} trades on file."],
            engine=self.name,
        )


# ---------------------------------------------------------------------------
# Rules (ordered: highest priority first)
# ---------------------------------------------------------------------------

def _build_rules() -> list[_Rule]:
    return [
        _Rule(
            name="first_time_user",
            matches=lambda m: m.total_trades == 0,
            render=lambda m: (
                "Welcome to Aurix. Try a small buy to see how the platform feels.",
                ["No transactions on file yet."],
            ),
        ),
        _Rule(
            name="dormant",
            matches=lambda m: (m.days_since_last_trade or 0) >= 14,
            render=lambda m: (
                f"You've been inactive for {m.days_since_last_trade} days. "
                "Gold has moved since your last trade — worth a check-in.",
                [
                    f"Last trade was {m.days_since_last_trade} days ago.",
                    f"Current price: €{m.current_price}/g.",
                ],
            ),
        ),
        _Rule(
            name="buying_above_average",
            matches=lambda m: (
                m.avg_buy_price is not None
                and m.buys_30d >= 3
                and m.current_price > m.avg_buy_price * Decimal("1.05")
            ),
            render=lambda m: (
                "You're buying frequently above your 30-day average price — "
                "consider waiting for a dip before adding more.",
                [
                    f"{m.buys_30d} buys in the last 30 days.",
                    f"Avg buy price: €{m.avg_buy_price}/g.",
                    f"Current price: €{m.current_price}/g (~"
                    f"{_pct(m.current_price, m.avg_buy_price)}% above your average).",
                ],
            ),
        ),
        _Rule(
            name="dca_pattern",
            matches=lambda m: (
                len(m.last_5_buy_prices) >= 5
                and _within_band(m.last_5_buy_prices, Decimal("0.02"))
            ),
            render=lambda m: (
                "Steady accumulation — your last 5 buys were within 2% of each "
                "other. That's textbook dollar-cost averaging.",
                [
                    f"Last 5 buy prices: " + ", ".join(f"€{p}" for p in m.last_5_buy_prices),
                    "All within a 2% band — DCA pattern detected.",
                ],
            ),
        ),
        _Rule(
            name="net_seller",
            matches=lambda m: m.sells_30d > m.buys_30d and m.sells_30d >= 3,
            render=lambda m: (
                "You've been a net seller this month. Make sure you're tracking "
                "any capital gains for tax purposes.",
                [
                    f"Sells (30d): {m.sells_30d}, Buys (30d): {m.buys_30d}.",
                    f"Net gold position: {m.net_position_grams}g.",
                ],
            ),
        ),
        _Rule(
            name="high_frequency",
            matches=lambda m: (m.buys_30d + m.sells_30d) >= 20,
            render=lambda m: (
                "High trading frequency detected. Frequent in/out trades can "
                "erode returns through spreads — consider longer horizons.",
                [
                    f"{m.buys_30d + m.sells_30d} trades in the last 30 days.",
                ],
            ),
        ),
    ]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _within_band(prices: list[Decimal], band: Decimal) -> bool:
    """True iff max/min - 1 <= band."""
    if not prices:
        return False
    lo, hi = min(prices), max(prices)
    if lo == 0:
        return False
    return (hi / lo - Decimal(1)) <= band


def _pct(numerator: Decimal, denominator: Decimal) -> str:
    if not denominator:
        return "0"
    delta = (numerator / denominator - Decimal(1)) * Decimal(100)
    return f"{delta.quantize(Decimal('0.1'))}"
