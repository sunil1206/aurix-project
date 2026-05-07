"""
Aurix - Domain exceptions and the project-wide DRF exception handler.

Why a custom hierarchy?
-----------------------
DRF's defaults are fine, but a fintech wants every error response to have a
predictable shape so the frontend can render it. We give every error a
machine-readable `code`, a human-readable `message`, and (optionally) a
`details` payload.

    {
        "error": {
            "code": "INSUFFICIENT_FUNDS",
            "message": "Wallet does not have enough EUR for this trade.",
            "details": {"available": "12.50", "requested": "200.00"},
            "request_id": "abc123"
        }
    }
"""
from __future__ import annotations

import logging
from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("aurix.errors")


class AurixError(Exception):
    """Base class for every domain-level error in Aurix."""

    code: str = "AURIX_ERROR"
    message: str = "An unexpected error occurred."
    http_status: int = status.HTTP_400_BAD_REQUEST

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        self.message = message or self.message
        self.details = details or {}
        super().__init__(self.message)


# --- Wallet / trading errors ----------------------------------------------

class InsufficientFunds(AurixError):
    code = "INSUFFICIENT_FUNDS"
    message = "Wallet does not have enough balance for this trade."
    http_status = status.HTTP_409_CONFLICT


class InvalidTradeAmount(AurixError):
    code = "INVALID_TRADE_AMOUNT"
    message = "Trade amount must be a positive decimal."
    http_status = status.HTTP_400_BAD_REQUEST


class WalletNotFound(AurixError):
    code = "WALLET_NOT_FOUND"
    message = "No wallet exists for this user."
    http_status = status.HTTP_404_NOT_FOUND


# --- Pricing / external service errors -------------------------------------

class PriceUnavailable(AurixError):
    code = "PRICE_UNAVAILABLE"
    message = "Could not retrieve a current gold price."
    http_status = status.HTTP_503_SERVICE_UNAVAILABLE


# --- Insights --------------------------------------------------------------

class InsightEngineError(AurixError):
    code = "INSIGHT_ENGINE_ERROR"
    message = "Could not generate insights."
    http_status = status.HTTP_502_BAD_GATEWAY


# ---------------------------------------------------------------------------
# DRF exception handler
# ---------------------------------------------------------------------------

def aurix_exception_handler(exc, context):
    """
    Project-wide DRF exception handler (wired in settings.REST_FRAMEWORK).

    Strategy:
        1. If it's an AurixError, render our envelope shape.
        2. Otherwise delegate to DRF's default and re-shape its response so
           the frontend always sees the same `{"error": {...}}` format.
    """
    request = context.get("request")
    request_id = getattr(request, "request_id", None) if request else None

    if isinstance(exc, AurixError):
        logger.warning("Aurix domain error: %s", exc.code, extra={"details": exc.details})
        return Response(
            {
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                    "request_id": request_id,
                }
            },
            status=exc.http_status,
        )

    response = drf_exception_handler(exc, context)
    if response is None:
        # Unhandled — let it bubble so Sentry/500 page kicks in.
        return None

    code = getattr(exc, "default_code", "ERROR")
    return Response(
        {
            "error": {
                "code": str(code).upper(),
                "message": _flatten_drf_detail(response.data),
                "details": response.data if isinstance(response.data, dict) else {},
                "request_id": request_id,
            }
        },
        status=response.status_code,
    )


def _flatten_drf_detail(data: Any) -> str:
    """Best-effort string extraction from DRF's nested error payloads."""
    if isinstance(data, dict):
        for v in data.values():
            return _flatten_drf_detail(v)
    if isinstance(data, list) and data:
        return _flatten_drf_detail(data[0])
    return str(data)
