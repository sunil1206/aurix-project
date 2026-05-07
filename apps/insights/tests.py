"""
Aurix - Insight engine tests.

The rule engine is a pure function over UserMetrics, so we don't need
the database to test it. We hand-build snapshots and assert the right
rule fires.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from apps.insights.engines import RuleInsightEngine, UserMetrics

NOW = datetime.now(timezone.utc)
ENGINE = RuleInsightEngine()


def _metrics(**overrides) -> UserMetrics:
    base = dict(
        user_id=1,
        total_trades=0,
        buys_30d=0,
        sells_30d=0,
        avg_buy_price=None,
        avg_sell_price=None,
        current_price=Decimal("65.00"),
        net_position_grams=Decimal("0"),
        days_since_last_trade=None,
        last_5_buy_prices=[],
        generated_at=NOW,
    )
    base.update(overrides)
    return UserMetrics(**base)


def test_first_time_user_message():
    insight = ENGINE.generate(_metrics())
    assert "Welcome" in insight.summary
    assert insight.engine == "rule"


def test_dormant_user_after_two_weeks():
    insight = ENGINE.generate(_metrics(total_trades=3, days_since_last_trade=20))
    assert "inactive" in insight.summary.lower()


def test_buying_above_average_triggers():
    insight = ENGINE.generate(_metrics(
        total_trades=5,
        buys_30d=5,
        avg_buy_price=Decimal("60.00"),
        current_price=Decimal("70.00"),     # 16% above avg
    ))
    assert "above your" in insight.summary.lower()


def test_dca_pattern_detected():
    insight = ENGINE.generate(_metrics(
        total_trades=5,
        buys_30d=5,
        avg_buy_price=Decimal("65.00"),
        current_price=Decimal("65.00"),
        last_5_buy_prices=[Decimal(p) for p in ("64.50", "65.00", "65.20", "65.10", "64.90")],
    ))
    assert "dollar-cost averaging" in insight.summary.lower()
