from django.urls import path

from .views import MarketInsightsView, MyInsightsView, UserInsightsView

urlpatterns = [
    path("", MyInsightsView.as_view(), name="insights-me"),
    path("market/", MarketInsightsView.as_view(), name="insights-market"),
    path("<int:user_id>/", UserInsightsView.as_view(), name="insights-user"),
]
