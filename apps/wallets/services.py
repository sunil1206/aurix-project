"""
Aurix - Wallet write services.

For now `add_money()` simply credits the EUR balance under a row lock.
In production this would be:
    - triggered by a Stripe webhook (PaymentIntent.succeeded), and
    - persisted to a separate `deposits` ledger table for compliance.
We mark this as a "demo deposit" in the response so the frontend can
make that distinction clear in the UI.
"""
from __future__ import annotations

import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import TYPE_CHECKING

from django.db import transaction

from apps.core.exceptions import InvalidTradeAmount, WalletNotFound

from .models import Wallet

if TYPE_CHECKING:
    from apps.users.models import User

logger = logging.getLogger("aurix.wallets")

EUR_QUANTUM = Decimal("0.01")
MAX_SINGLE_DEPOSIT_EUR = Decimal("100000.00")


@transaction.atomic
def add_money(user: "User", eur_amount) -> Wallet:
    """Atomically credit the user's wallet with `eur_amount` EUR."""
    try:
        amount = Decimal(str(eur_amount))
    except Exception as exc:
        raise InvalidTradeAmount(
            "eur_amount is not a valid number.",
            details={"eur_amount": str(eur_amount)},
        ) from exc

    if amount <= 0:
        raise InvalidTradeAmount(
            "eur_amount must be greater than zero.",
            details={"eur_amount": str(amount)},
        )
    if amount > MAX_SINGLE_DEPOSIT_EUR:
        raise InvalidTradeAmount(
            f"Single deposit cannot exceed €{MAX_SINGLE_DEPOSIT_EUR}.",
            details={"eur_amount": str(amount)},
        )

    amount = amount.quantize(EUR_QUANTUM, rounding=ROUND_HALF_UP)

    try:
        wallet = Wallet.objects.select_for_update().get(user=user)
    except Wallet.DoesNotExist as exc:
        raise WalletNotFound() from exc

    wallet.eur_balance += amount
    wallet.save(update_fields=["eur_balance", "updated_at"])

    logger.info("deposit user=%s eur=%s new_balance=%s", user.id, amount, wallet.eur_balance)
    return wallet
