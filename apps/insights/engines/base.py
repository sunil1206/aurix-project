"""
Aurix - Insight engine contract.

The metrics snapshot is computed once in `apps.insights.services` and
passed to whichever engine is configured. Engines are pure functions of
that snapshot, which makes them trivially testable and swappable.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True)
class UserMetrics:
    """
    Numeric snapshot of a user's trading behaviour.

    Engines must NOT issue further DB queries — everything they need to
    know is on this object. That keeps engine logic deterministic and
    cache-friendly.
    """
    user_id: int
    total_trades: int
    buys_30d: int
    sells_30d: int
    avg_buy_price: Decimal | None
    avg_sell_price: Decimal | None
    current_price: Decimal
    net_position_grams: Decimal
    days_since_last_trade: int | None
    last_5_buy_prices: list[Decimal] = field(default_factory=list)
    generated_at: datetime | None = None


@dataclass(frozen=True)
class Insight:
    """The user-facing analysis returned by every engine."""
    summary: str
    reasoning: list[str]
    engine: str       # which engine produced this — for transparency in the UI


class BaseInsightEngine(ABC):
    """All engines must implement this interface."""

    name: str = "base"

    @abstractmethod
    def generate(self, metrics: UserMetrics) -> Insight:
        """Synchronously return an Insight from the supplied metrics."""
        raise NotImplementedError
