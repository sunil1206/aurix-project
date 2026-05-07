"""Aurix - Extra wallet serializers (kept separate to avoid Write-tool truncation)."""
from decimal import Decimal
from rest_framework import serializers


class DepositRequestSerializer(serializers.Serializer):
    eur_amount = serializers.DecimalField(
        max_digits=18, decimal_places=2, min_value=Decimal("0.01"),
    )
