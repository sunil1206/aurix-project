"""
Aurix - Transaction model.

The transactions table is the immutable ledger. Every state change in a
wallet is derivable from an ordered scan of transactions for that wallet.
We never UPDATE a transaction row, only INSERT.
"""
from __future__ import annotations

from decimal import Decimal

from django.db import models

from apps.wallets.models import Wallet


class TransactionType(models.TextChoices):
    BUY = "BUY", "Buy"
    SELL = "SELL", "Sell"


class Transaction(models.Model):
    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.PROTECT,           # never lose ledger history
        related_name="transactions",
    )
    type = models.CharField(
        max_length=4,
        choices=TransactionType.choices,
    )
    eur_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        help_text="Absolute EUR value moved (always positive).",
    )
    gold_amount = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        help_text="Absolute gold (grams) moved (always positive).",
    )
    price_per_gram = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        help_text="Execution price snapshotted at the time of the trade.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(eur_amount__gt=0),
                name="tx_eur_amount_positive",
            ),
            models.CheckConstraint(
                check=models.Q(gold_amount__gt=0),
                name="tx_gold_amount_positive",
            ),
            models.CheckConstraint(
                check=models.Q(price_per_gram__gt=0),
                name="tx_price_positive",
            ),
        ]
        indexes = [
            models.Index(fields=["wallet", "-created_at"]),
            models.Index(fields=["wallet", "type", "-created_at"]),
        ]

    def __str__(self) -> str:
        return (
            f"Tx#{self.pk} {self.type} "
            f"€{self.eur_amount} ↔ {self.gold_amount}g @ €{self.price_per_gram}/g"
        )
