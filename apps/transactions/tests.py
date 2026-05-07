"""
Aurix - Transaction service tests.

Run with:  pytest apps/transactions/tests.py -v
"""
from __future__ import annotations

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from apps.core.exceptions import InsufficientFunds, InvalidTradeAmount
from apps.transactions.models import Transaction, TransactionType
from apps.transactions.services import buy_gold, sell_gold
from apps.wallets.models import Wallet

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def user(db) -> "User":
    return User.objects.create_user(email="trader@aurix.test", password="x" * 12)


@pytest.fixture
def wallet(user) -> Wallet:
    # Created by signal, but explicit fetch is clearer in tests.
    return Wallet.objects.get(user=user)


# ---------------------------------------------------------------------------
# buy_gold
# ---------------------------------------------------------------------------

def test_buy_gold_credits_wallet_and_writes_ledger(user, wallet):
    tx = buy_gold(user, Decimal("130.00"))

    wallet.refresh_from_db()
    assert wallet.eur_balance == Decimal("870.00")
    # 130 EUR / 65 EUR/g = 2.0 grams (mock price from settings)
    assert wallet.gold_grams == Decimal("2.000000")

    assert tx.type == TransactionType.BUY
    assert tx.eur_amount == Decimal("130.00")
    assert tx.gold_amount == Decimal("2.000000")
    assert tx.price_per_gram == Decimal("65.0000")


def test_buy_gold_raises_insufficient_funds(user):
    with pytest.raises(InsufficientFunds):
        buy_gold(user, Decimal("9999.99"))


def test_buy_gold_rejects_zero_or_negative(user):
    with pytest.raises(InvalidTradeAmount):
        buy_gold(user, Decimal("0"))
    with pytest.raises(InvalidTradeAmount):
        buy_gold(user, Decimal("-1"))


# ---------------------------------------------------------------------------
# sell_gold
# ---------------------------------------------------------------------------

def test_sell_gold_credits_eur_and_writes_ledger(user, wallet):
    buy_gold(user, Decimal("325.00"))     # buy 5g at €65
    sell_tx = sell_gold(user, Decimal("2"))

    wallet.refresh_from_db()
    assert wallet.gold_grams == Decimal("3.000000")
    assert wallet.eur_balance == Decimal("805.00")     # 1000 - 325 + 130
    assert sell_tx.type == TransactionType.SELL
    assert sell_tx.eur_amount == Decimal("130.00")


def test_sell_gold_blocks_if_no_gold(user):
    with pytest.raises(InsufficientFunds):
        sell_gold(user, Decimal("1"))


# ---------------------------------------------------------------------------
# Ledger immutability
# ---------------------------------------------------------------------------

def test_ledger_is_append_only(user):
    buy_gold(user, Decimal("65"))
    buy_gold(user, Decimal("130"))
    assert Transaction.objects.filter(wallet__user=user).count() == 2
