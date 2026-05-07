"""
Aurix - Wallet serializers.
"""
from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from services.price_service import get_current_price

from .models import Wallet


class WalletSerializer(serializers.ModelSerializer):
    """Wallet read serializer — augments with EUR-equivalent gold value."""

    gold_value_eur = serializers.SerializerMethodField()
    price_per_gram_eur = serializers.SerializerMethodField()

    class Meta:
        model = Wallet
        fields = (
            "eur_balance",
            "gold_grams",
            "gold_value_eur",
            "price_per_gram_eur",
            "updated_at",
        )
        read_only_fields = fields

    def get_price_per_gram_eur(self, _wallet: Wallet) -> str:
        try:
            return str(get_current_price().price_eur_per_gram)
        except Exception:
            # Don't blow up the wallet read just because the price feed is down.
            return "0.00"

    def get_gold_value_eur(self, wallet: Wallet) -> str:
        try:
            spot = get_current_price().price_eur_per_gram
        except Exception:
            spot = Decimal("0")
        return str(wallet.gold_value_eur(spot))
