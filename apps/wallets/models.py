"""
Aurix - Wallet model.

Defence in depth:
    - Service layer validates "no negative balances" before writing.
    - DB-level CHECK constraints make sure a buggy migration / raw SQL /
      future code path cannot violate the invariant either.

Money fields use Decimal — never float.
"""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models


class Wallet(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallet",
    )

    eur_balance = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="EUR cash balance, in euros (cents precision).",
    )

    gold_grams = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        default=Decimal("0.000000"),
        help_text="Gold balance in grams, with sub-milligram precision.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(eur_balance__gte=0),
                name="wallet_eur_balance_non_negative",
            ),
            models.CheckConstraint(
                check=models.Q(gold_grams__gte=0),
                name="wallet_gold_grams_non_negative",
            ),
        ]
        indexes = [models.Index(fields=["user"])]

    def __str__(self) -> str:
        return f"Wallet({self.user.email}: €{self.eur_balance}, {self.gold_grams}g)"

    # -- Convenience read-only computed property used by serializers ---------
    def gold_value_eur(self, price_per_gram: Decimal) -> Decimal:
        return (self.gold_grams * price_per_gram).quantize(Decimal("0.01"))
