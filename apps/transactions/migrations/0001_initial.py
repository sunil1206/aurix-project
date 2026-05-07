"""
Aurix - Initial migration for the Transaction (immutable ledger) model.
Generated to match apps.transactions.models.Transaction.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("wallets", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Transaction",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name="ID",
                )),
                ("type", models.CharField(
                    choices=[("BUY", "Buy"), ("SELL", "Sell")],
                    max_length=4,
                )),
                ("eur_amount", models.DecimalField(
                    decimal_places=2,
                    help_text="Absolute EUR value moved (always positive).",
                    max_digits=18,
                )),
                ("gold_amount", models.DecimalField(
                    decimal_places=6,
                    help_text="Absolute gold (grams) moved (always positive).",
                    max_digits=18,
                )),
                ("price_per_gram", models.DecimalField(
                    decimal_places=4,
                    help_text="Execution price snapshotted at the time of the trade.",
                    max_digits=12,
                )),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("wallet", models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="transactions",
                    to="wallets.wallet",
                )),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["wallet", "-created_at"],
                        name="tx_wallet_created_idx",
                    ),
                    models.Index(
                        fields=["wallet", "type", "-created_at"],
                        name="tx_wallet_type_created_idx",
                    ),
                ],
                "constraints": [
                    models.CheckConstraint(
                        check=models.Q(("eur_amount__gt", 0)),
                        name="tx_eur_amount_positive",
                    ),
                    models.CheckConstraint(
                        check=models.Q(("gold_amount__gt", 0)),
                        name="tx_gold_amount_positive",
                    ),
                    models.CheckConstraint(
                        check=models.Q(("price_per_gram__gt", 0)),
                        name="tx_price_positive",
                    ),
                ],
            },
        ),
    ]
