"""
Aurix - bundled gold news fixture.

Used as the absolute last-resort fallback when every live news source
(Google News RSS, Yahoo Finance RSS, etc.) fails to return anything.
These are real headline patterns from major outlets, varied so the
FinBERT/lexicon scorer produces a meaningful net sentiment.

In production you'd refresh this monthly via a scheduled task or
swap it out for a paid feed (Finnhub, NewsAPI, Bloomberg API).
"""
from __future__ import annotations

from typing import List

GOLD_HEADLINES_FIXTURE: List[dict] = [
    {
        "title": "Gold rallies to record high as central banks accelerate buying spree",
        "source": "Reuters",
        "url": "https://www.reuters.com/markets/commodities/",
    },
    {
        "title": "Federal Reserve signals dovish pivot, fueling demand for safe-haven assets",
        "source": "Bloomberg",
        "url": "https://www.bloomberg.com/markets/commodities/",
    },
    {
        "title": "ECB hints at additional rate cuts as eurozone inflation cools",
        "source": "Financial Times",
        "url": "https://www.ft.com/commodities",
    },
    {
        "title": "Geopolitical tensions in Middle East drive renewed safe-haven demand for gold",
        "source": "Wall Street Journal",
        "url": "https://www.wsj.com/finance/commodities-futures",
    },
    {
        "title": "World Gold Council reports record central bank purchases for fifth straight month",
        "source": "MarketWatch",
        "url": "https://www.marketwatch.com/investing/future/gc00",
    },
    {
        "title": "Strong US jobs report dampens near-term rate cut bets, gold slips slightly",
        "source": "CNBC",
        "url": "https://www.cnbc.com/quotes/@GC.1",
    },
]
