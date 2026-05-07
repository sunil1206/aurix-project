from django.urls import path

from .views import BuyView, SellView, TransactionHistoryView

urlpatterns = [
    path("", TransactionHistoryView.as_view(), name="tx-history"),
    path("buy/", BuyView.as_view(), name="tx-buy"),
    path("sell/", SellView.as_view(), name="tx-sell"),
]
