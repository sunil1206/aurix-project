"""
Aurix - Trading services.

These functions are the ONLY place wallet balances mutate. Views call
them; admin scripts call them; tests call them. Every entry point goes
through the same atomic, locked code path so we cannot accidentally
introduce a race condition by adding a new view later.

Key correctness properties:

    1. `transaction.atomic()` wraps the whole operation. If anything
       raises, the wallet update AND the ledger insert are rolled back
       together — we never end up with a debited wallet but no ledger
       entry, or vice versa.

    2. `select_for_update()` takes a row-level write lock on the wallet.
       Two concurrent buys on the same wallet are serialised by Postgres,
       so we cannot oversell or overdraw.

    3. We always re-read the wallet inside the transaction. Any value
       the caller passed in is treated as a hint, not as truth.

    4. Money math uses Decimal with explicit quantization.
"""
from __future__ import annotations

import logging
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP
from typing import TYPE_CHECKING

from django.db import transaction

from apps.core.exceptions import (
    InsufficientFunds,
    InvalidTradeAmount,
    WalletNotFound,
)
from apps.wallets.models import Wallet
from services.price_service import get_current_price

from .models import Transaction, TransactionType

if TYPE_CHECKING:
    from apps.users.models import User

logger = logging.getLogger("aurix.trades")

EUR_QUANTUM = Decimal("0.01")
GOLD_QUANTUM = Decimal("0.000001")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def buy_gold(user: "User", eur_amount: Decimal) -> Transaction:
    """
    Convert EUR → gold at the current spot price.

    Args:
        user:        Authenticated user.
        eur_amount:  How many EUR to spend. Must be > 0.

    Returns:
        The persisted Transaction row.

    Raises:
        InvalidTradeAmount, InsufficientFunds, WalletNotFound,
        PriceUnavailable.
    """
    eur_amount = _validate_positive(eur_amount, "eur_amount")
    spot = get_current_price().price_eur_per_gram
    gold_to_credit = (eur_amount / spot).quantize(GOLD_QUANTUM, rounding=ROUND_DOWN)

    if gold_to_credit <= 0:
        raise InvalidTradeAmount(
            "Order is too small — would round down to zero gold.",
            details={"eur_amount": str(eur_amount), "price": str(spot)},
        )

    return _execute_trade(
        user=user,
        ttype=TransactionType.BUY,
        eur_amount=eur_amount.quantize(EUR_QUANTUM, rounding=ROUND_HALF_UP),
        gold_amount=gold_to_credit,
        price_per_gram=spot,
    )


def sell_gold(user: "User", gold_amount: Decimal) -> Transaction:
    """
    Convert gold → EUR at the current spot price.

    Args:
        user:         Authenticated user.
        gold_amount:  How many grams to sell. Must be > 0.
    """
    gold_amount = _validate_positive(gold_amount, "gold_amount").quantize(
        GOLD_QUANTUM, rounding=ROUND_DOWN
    )
    spot = get_current_price().price_eur_per_gram
    eur_to_credit = (gold_amount * spot).quantize(EUR_QUANTUM, rounding=ROUND_HALF_UP)

    if eur_to_credit <= 0:
        raise InvalidTradeAmount(
            "Order is too small — would round down to zero EUR.",
            details={"gold_amount": str(gold_amount), "price": str(spot)},
        )

    return _execute_trade(
        user=user,
        ttype=TransactionType.SELL,
        eur_amount=eur_to_credit,
        gold_amount=gold_amount,
        price_per_gram=spot,
    )


# ---------------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------------

def _validate_positive(value, field_name: str) -> Decimal:
    """Coerce to Decimal and guarantee strict positivity."""
    try:
        decimal_value = Decimal(str(value))
    except Exception as exc:
        raise InvalidTradeAmount(
            f"Field '{field_name}' is not a valid number.",
            details={field_name: str(value)},
        ) from exc

    if decimal_value <= 0:
        raise InvalidTradeAmount(
            f"Field '{field_name}' must be greater than zero.",
            details={field_name: str(value)},
        )
    return decimal_value


@transaction.atomic
def _execute_trade(
    *,
    user: "User",
    ttype: str,
    eur_amount: Decimal,
    gold_amount: Decimal,
    price_per_gram: Decimal,
) -> Transaction:
    """
    Lock the wallet, validate balances, mutate, write the ledger row.
    All under one DB transaction.
    """
    try:
        wallet = (
            Wallet.objects
            .select_for_update()
            .get(user=user)
        )
    except Wallet.DoesNotExist as exc:
        raise WalletNotFound() from exc

    if ttype == TransactionType.BUY:
        if wallet.eur_balance < eur_amount:
            raise InsufficientFunds(
                "Not enough EUR to complete this buy.",
                details={
                    "available_eur": str(wallet.eur_balance),
                    "requested_eur": str(eur_amount),
                },
            )
        wallet.eur_balance -= eur_amount
        wallet.gold_grams += gold_amount

    elif ttype == TransactionType.SELL:
        if wallet.gold_grams < gold_amount:
            raise InsufficientFunds(
                "Not enough gold to complete this sell.",
                details={
                    "available_grams": str(wallet.gold_grams),
                    "requested_grams": str(gold_amount),
                },
            )
        wallet.gold_grams -= gold_amount
        wallet.eur_balance += eur_amount

    else:                                                     # pragma: no cover
        raise InvalidTradeAmount(f"Unknown transaction type: {ttype}")

    wallet.save(update_fields=["eur_balance", "gold_grams", "updated_at"])

    tx = Transaction.objects.create(
        wallet=wallet,
        type=ttype,
        eur_amount=eur_amount,
        gold_amount=gold_amount,
        price_per_gram=price_per_gram,
    )

    logger.info(
        "trade.executed user=%s type=%s eur=%s gold=%s price=%s tx=%s",
        user.id, ttype, eur_amount, gold_amount, price_per_gram, tx.id,
    )
    return tx
