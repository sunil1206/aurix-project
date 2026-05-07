"""
Aurix - Initial migration for the Wallet model.
Generated to match apps.wallets.models.Wallet (incl. CHECK constraints).
"""
from decimal import Decimal

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Wallet",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name="ID",
                )),
                ("eur_balance", models.DecimalField(
                    decimal_places=2,
                    default=Decimal("0.00"),
                    help_text="EUR cash balance, in euros (cents precision).",
                    max_digits=18,
                )),
                ("gold_grams", models.DecimalField(
                    decimal_places=6,
                    default=Decimal("0.000000"),
                    help_text="Gold balance in grams, with sub-milligram precision.",
                    max_digits=18,
                )),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="wallet",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "indexes": [
                    models.Index(fields=["user"], name="wallets_wal_user_id_idx"),
                ],
                "constraints": [
                    models.CheckConstraint(
                        check=models.Q(("eur_balance__gte", 0)),
                        name="wallet_eur_balance_non_negative",
                    ),
                    models.CheckConstraint(
                        check=models.Q(("gold_grams__gte", 0)),
                        name="wallet_gold_grams_non_negative",
                    ),
                ],
            },
        ),
    ]
