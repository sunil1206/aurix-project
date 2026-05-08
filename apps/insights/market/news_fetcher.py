"""
Aurix - Real macro headline fetcher.

Tries multiple free, no-API-key sources in order, then falls through to
a bundled real-flavour fixture so the News tab is NEVER empty:

    1. Google News RSS    (aggregates Reuters / Bloomberg / FT / WSJ)
    2. Yahoo Finance RSS  (commodity-tagged feed)
    3. Investing.com RSS  (commodities news)
    4. Bundled fixture    (apps/insights/market/fixtures/news_seed.py)

Successful fetches are cached in Redis for 10 minutes.
"""
from __future__ import annotations

import logging
from typing import List
from xml.etree import ElementTree as ET

import httpx
from django.core.cache import cache

from .fixtures.news_seed import GOLD_HEADLINES_FIXTURE

logger = logging.getLogger("aurix.market.news")

CACHE_KEY = "aurix:market:news:gold"
CACHE_TTL_SECONDS = 600
MAX_HEADLINES = 6

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
    "Accept-Language": "en-US,en;q=0.9",
}

GOOGLE_NEWS_RSS = (
    "https://news.google.com/rss/search"
    "?q=%22gold+price%22+OR+XAU+OR+bullion+when:7d"
    "&hl=en-US&gl=US&ceid=US:en"
)
YAHOO_NEWS_RSS = "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F&region=US&lang=en-US"
INVESTING_RSS  = "https://www.investing.com/rss/news_301.rss"


def fetch_gold_headlines(limit: int = MAX_HEADLINES) -> List[dict]:
    """Returns a list of {title, source, url}. NEVER empty."""
    cache_key = f"{CACHE_KEY}:{limit}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    for fetcher in (_fetch_google, _fetch_yahoo, _fetch_investing):
        try:
            items = fetcher(limit)
        except Exception as exc:
            logger.warning("%s failed: %s", fetcher.__name__, exc)
            items = []
        if items:
            logger.info("News from %s: %d headlines", fetcher.__name__, len(items))
            cache.set(cache_key, items, timeout=CACHE_TTL_SECONDS)
            return items

    logger.warning("All live news sources failed; using bundled fixture.")
    out = list(GOLD_HEADLINES_FIXTURE)[:limit]
    cache.set(cache_key, out, timeout=CACHE_TTL_SECONDS)
    return out


def _fetch_google(limit):
    return _fetch_rss(GOOGLE_NEWS_RSS, limit, "Google News")


def _fetch_yahoo(limit):
    return _fetch_rss(YAHOO_NEWS_RSS, limit, "Yahoo Finance")


def _fetch_investing(limit):
    return _fetch_rss(INVESTING_RSS, limit, "Investing.com")


def _fetch_rss(url: str, limit: int, default_source: str) -> List[dict]:
    with httpx.Client(timeout=8.0, headers=HEADERS, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        xml_text = resp.text
    return _parse_rss(xml_text, limit, default_source)


def _parse_rss(xml_text: str, limit: int, default_source: str) -> List[dict]:
    out: List[dict] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.warning("RSS unparseable: %s", exc)
        return out

    for item in root.iter("item"):
        title_el = item.find("title")
        link_el  = item.find("link")
        src_el   = item.find("source")

        title  = (title_el.text or "").strip() if title_el is not None else ""
        link   = (link_el.text  or "").strip() if link_el  is not None else ""
        source = (src_el.text   or "").strip() if src_el   is not None else ""

        if not source and " - " in title:
            title, source = title.rsplit(" - ", 1)
            title  = title.strip()
            source = source.strip()

        if title:
            out.append({
                "title":  title,
                "source": source or default_source,
                "url":    link or "#",
            })
        if len(out) >= limit:
            break
    return out
