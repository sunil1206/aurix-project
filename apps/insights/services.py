"""
Aurix - Insight orchestration service.

Computes a `UserMetrics` snapshot from the transaction ledger, then hands
it to whichever engine is configured. Aggregation queries are pushed into
the database so this scales linearly with active users (not with ledger
size per user).
"""
from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from django.db.models import Avg, Count, Q

from apps.core.exceptions import WalletNotFound
from apps.transactions.models import Transaction, TransactionType
from apps.wallets.models import Wallet
from services.price_service import get_current_price

from .engines import Insight, UserMetrics, get_engine

if TYPE_CHECKING:
    from apps.users.models import User

WINDOW_DAYS = 30


def insights_for_user(user: "User") -> dict:
    """Build metrics, run the engine, return a JSON-ready payload."""
    metrics = _collect_metrics(user)
    engine = get_engine()
    insight: Insight = engine.generate(metrics)

    return {
        "user_id": user.id,
        "engine": insight.engine,
        "generated_at": metrics.generated_at.isoformat() if metrics.generated_at else None,
        "summary": insight.summary,
        "reasoning": insight.reasoning,
        "metrics": _public_metrics(metrics),
    }


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def _collect_metrics(user: "User") -> UserMetrics:
    try:
        wallet = Wallet.objects.get(user=user)
    except Wallet.DoesNotExist as exc:
        raise WalletNotFound() from exc

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=WINDOW_DAYS)
    qs = Transaction.objects.filter(wallet=wallet)

    # Single round-trip aggregate.
    agg = qs.filter(created_at__gte=window_start).aggregate(
        buys_30d=Count("id", filter=Q(type=TransactionType.BUY)),
        sells_30d=Count("id", filter=Q(type=TransactionType.SELL)),
        avg_buy_price=Avg("price_per_gram", filter=Q(type=TransactionType.BUY)),
        avg_sell_price=Avg("price_per_gram", filter=Q(type=TransactionType.SELL)),
    )

    last_buys = list(
        qs.filter(type=TransactionType.BUY)
          .order_by("-created_at")
          .values_list("price_per_gram", flat=True)[:5]
    )

    last_tx_at = qs.order_by("-created_at").values_list("created_at", flat=True).first()
    days_since = (now - last_tx_at).days if last_tx_at else None

    try:
        spot = get_current_price().price_eur_per_gram
    except Exception:
        spot = Decimal("0")

    return UserMetrics(
        user_id=user.id,
        total_trades=qs.count(),
        buys_30d=agg["buys_30d"] or 0,
        sells_30d=agg["sells_30d"] or 0,
        avg_buy_price=_q(agg["avg_buy_price"]),
        avg_sell_price=_q(agg["avg_sell_price"]),
        current_price=spot,
        net_position_grams=wallet.gold_grams,
        days_since_last_trade=days_since,
        last_5_buy_prices=[Decimal(p) for p in last_buys],
        generated_at=now,
    )


def _q(value) -> Decimal | None:
    """Quantize a possibly-None aggregate to 4dp."""
    if value is None:
        return None
    return Decimal(value).quantize(Decimal("0.0001"))


def _public_metrics(m: UserMetrics) -> dict:
    """Subset of metrics safe to expose via the API."""
    return {
        "buys_30d": m.buys_30d,
        "sells_30d": m.sells_30d,
        "avg_buy_price": str(m.avg_buy_price) if m.avg_buy_price else None,
        "avg_sell_price": str(m.avg_sell_price) if m.avg_sell_price else None,
        "current_price": str(m.current_price),
        "net_position_grams": str(m.net_position_grams),
        "days_since_last_trade": m.days_since_last_trade,
        "total_trades": m.total_trades,
    }
