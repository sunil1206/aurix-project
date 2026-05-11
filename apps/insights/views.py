"""Aurix - Insight views."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsSelfOrAdmin

from .market import get_full_insight
from .services import insights_for_user

User = get_user_model()


class MyInsightsView(APIView):
    """GET /api/insights/  - behavioural insights for the authenticated user."""

    def get(self, request):
        return Response(insights_for_user(request.user))


class UserInsightsView(APIView):
    """GET /api/insights/<user_id>/  - self or staff only."""
    permission_classes = APIView.permission_classes + [IsSelfOrAdmin]

    def get(self, request, user_id: int):
        target = get_object_or_404(User, pk=user_id)
        return Response(insights_for_user(target))


class MarketInsightsView(APIView):
    """
    GET /api/insights/market/

    PUBLIC — anyone can read the market view (it's user-agnostic data).
    This lets the landing page show live charts + AI insights as a demo
    without requiring registration.

    Quant view of the gold market: indicators + signal + sentiment + LLM summary.
    Query params: ?period=3y&interval=1d
    """
    permission_classes = [AllowAny]

    def get(self, request):
        period = request.query_params.get("period", "3y")
        interval = request.query_params.get("interval", "1d")
        return Response(get_full_insight(period=period, interval=interval))
