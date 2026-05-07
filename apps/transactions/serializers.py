"""
Aurix - Transaction serializers.
"""
from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from apps.wallets.serializers import WalletSerializer

from .models import Transaction


class BuyRequestSerializer(serializers.Serializer):
    """Body schema for POST /transactions/buy/."""

    eur_amount = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )


class SellRequestSerializer(serializers.Serializer):
    """Body schema for POST /transactions/sell/."""

    gold_amount = serializers.DecimalField(
        max_digits=18,
        decimal_places=6,
        min_value=Decimal("0.000001"),
    )


class TransactionSerializer(serializers.ModelSerializer):
    """Read serializer used by the history endpoint."""

    class Meta:
        model = Transaction
        fields = (
            "id",
            "type",
            "eur_amount",
            "gold_amount",
            "price_per_gram",
            "created_at",
        )
        read_only_fields = fields


class TradeResultSerializer(serializers.ModelSerializer):
    """Returned from buy/sell — includes the new wallet snapshot."""

    wallet_after = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = (
            "id",
            "type",
            "eur_amount",
            "gold_amount",
            "price_per_gram",
            "created_at",
            "wallet_after",
        )
        read_only_fields = fields

    def get_wallet_after(self, tx: Transaction) -> dict:
        return WalletSerializer(tx.wallet).data
