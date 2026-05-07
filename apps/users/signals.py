"""
Aurix - User signals.

A new user automatically gets a wallet seeded with the configured
INITIAL_EUR_BALANCE. Doing this in a signal (rather than in the
RegisterView) keeps the invariant true even when users are created via
`createsuperuser`, the admin, or fixtures.
"""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.users.models import User
from apps.wallets.models import Wallet


@receiver(post_save, sender=User)
def create_wallet_on_user_creation(sender, instance: User, created: bool, **kwargs):
    if not created:
        return
    Wallet.objects.get_or_create(
        user=instance,
        defaults={"eur_balance": Decimal(settings.AURIX["INITIAL_EUR_BALANCE"])},
    )
