"""
Aurix - Market analysis package.

The behavioural insight engine in `apps/insights/services.py` answers:
    "What is THIS USER doing?"
This package answers a different question:
    "What is THE MARKET doing?"

The two are independent. The market endpoint (/api/insights/market/) is
auth-required but user-agnostic — every authenticated user gets the same
quant view of the gold market.
"""
from .orchestrator import get_full_insight  # noqa: F401
