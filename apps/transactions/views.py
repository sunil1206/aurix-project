"""
Aurix - Transaction views.

Buy and Sell are throttled with a tighter scoped bucket than the global
default — financial endpoints deserve stricter limits.
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Transaction
from .serializers import (
    BuyRequestSerializer,
    SellRequestSerializer,
    TradeResultSerializer,
    TransactionSerializer,
)
from .services import buy_gold, sell_gold


class _TradeThrottle(ScopedRateThrottle):
    """Use the `trade` rate from REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']."""
    scope = "trade"


class BuyView(APIView):
    """POST /api/transactions/buy/  — convert EUR → gold."""

    throttle_classes = [_TradeThrottle]
    throttle_scope = "trade"

    def post(self, request):
        ser = BuyRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        tx = buy_gold(request.user, ser.validated_data["eur_amount"])
        return Response(TradeResultSerializer(tx).data, status=status.HTTP_201_CREATED)


class SellView(APIView):
    """POST /api/transactions/sell/  — convert gold → EUR."""

    throttle_classes = [_TradeThrottle]
    throttle_scope = "trade"

    def post(self, request):
        ser = SellRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        tx = sell_gold(request.user, ser.validated_data["gold_amount"])
        return Response(TradeResultSerializer(tx).data, status=status.HTTP_201_CREATED)


class TransactionHistoryView(ListAPIView):
    """
    GET /api/transactions/

    Paginated, newest-first. Optional filter `?type=BUY|SELL`.
    """
    serializer_class = TransactionSerializer

    def get_queryset(self):
        qs = Transaction.objects.filter(wallet__user=self.request.user)
        ttype = self.request.query_params.get("type")
        if ttype:
            qs = qs.filter(type=ttype.upper())
        return qs
