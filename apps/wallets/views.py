"""Aurix - Wallet views."""
from __future__ import annotations

from rest_framework import status
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import WalletNotFound

from .models import Wallet
from .serializers import WalletSerializer
from .serializers_extra import DepositRequestSerializer
from .services import add_money


class MyWalletView(RetrieveAPIView):
    """GET /api/wallet/  - current user's wallet."""

    serializer_class = WalletSerializer

    def get_object(self) -> Wallet:
        try:
            return self.request.user.wallet
        except Wallet.DoesNotExist as exc:
            raise WalletNotFound() from exc


class DepositView(APIView):
    """
    POST /api/wallet/deposit/
    Body: {"eur_amount": "500.00"}

    Demo deposit endpoint - bumps the user's EUR balance. In production
    this would be triggered by a Stripe / Open Banking webhook.
    """

    def post(self, request):
        ser = DepositRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        wallet = add_money(request.user, ser.validated_data["eur_amount"])
        return Response(
            {
                "wallet": WalletSerializer(wallet).data,
                "deposited_eur": str(ser.validated_data["eur_amount"]),
                "note": "Demo deposit; in production this is a Stripe webhook.",
            },
            status=status.HTTP_201_CREATED,
        )
