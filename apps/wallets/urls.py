from django.urls import path
from .views import DepositView, MyWalletView

urlpatterns = [
    path("", MyWalletView.as_view(), name="wallet-me"),
    path("deposit/", DepositView.as_view(), name="wallet-deposit"),
]
