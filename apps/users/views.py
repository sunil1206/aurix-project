"""
Aurix - User views.
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.wallets.serializers import WalletSerializer

from .serializers import RegisterSerializer, UserSerializer


class RegisterView(APIView):
    """
    POST /api/auth/register/

    Creates a new user, auto-creates their wallet (via signal), and returns
    a fresh JWT pair so the frontend can immediately authenticate.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = RegisterSerializer.issue_tokens(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": tokens,
                "wallet": WalletSerializer(user.wallet).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/  — issues access + refresh tokens."""
    permission_classes = [AllowAny]


class RefreshView(TokenRefreshView):
    """POST /api/auth/refresh/  — exchanges a refresh token for a new access."""
    permission_classes = [AllowAny]


class MeView(APIView):
    """GET /api/auth/me/  — returns the authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
