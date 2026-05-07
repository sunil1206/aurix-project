"""
Aurix - Real macro headline fetcher.

Pulls live gold-related news from Google News RSS — free, no API key,
no rate limits we've ever hit. Cached in Redis for 10 minutes so we
don't re-fetch on every request.

Why Google News RSS?
    - Aggregates Reuters, Bloomberg, FT, WSJ, MarketWatch, etc.
    - Public RSS endpoint, no token rotation needed.
    - Returns 20+ headlines per query; we keep the top N.
"""
from __future__ import annotations

import logging
from typing import List
from urllib.parse import quote_plus
from xml.etree import ElementTree as ET

import httpx
from django.core.cache import cache

logger = logging.getLogger("aurix.market.news")

CACHE_KEY = "aurix:market:news:gold"
CACHE_TTL_SECONDS = 600  # 10 minutes

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Aurix/1.0)"}

DEFAULT_QUERY = '("gold price" OR "XAU" OR "bullion") when:7d'
MAX_HEADLINES = 6


def fetch_gold_headlines(query: str | None = None, limit: int = MAX_HEADLINES) -> List[dict]:
    """
    Returns up to `limit` recent headlines as
        [{"title": ..., "source": ..., "url": ...}, ...]
    On any failure returns []; the sentiment layer falls back to mocks.
    """
    cache_key = f"{CACHE_KEY}:{query or 'default'}:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    headlines = _fetch(query or DEFAULT_QUERY, limit)
    if headlines:
        cache.set(cache_key, headlines, timeout=CACHE_TTL_SECONDS)
    return headlines


def _fetch(query: str, limit: int) -> List[dict]:
    params = {
        "q": query,
        "hl": "en-US",
        "gl": "US",
        "ceid": "US:en",
    }
    try:
        with httpx.Client(timeout=8.0, headers=HEADERS, follow_redirects=True) as client:
            resp = client.get(GOOGLE_NEWS_RSS, params=params)
            resp.raise_for_status()
            xml_text = resp.text
    except httpx.HTTPError as exc:
        logger.warning("Google News RSS unreachable: %s", exc)
        return []

    return _parse_rss(xml_text, limit)


def _parse_rss(xml_text: str, limit: int) -> List[dict]:
    """RSS 2.0: rss/channel/item with title, link, source."""
    out: List[dict] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.warning("Google News RSS unparseable: %s", exc)
        return out

    for item in root.iter("item"):
        title_el = item.find("title")
        link_el  = item.find("link")
        src_el   = item.find("source")

        title = (title_el.text or "").strip() if title_el is not None else ""
        link  = (link_el.text or "").strip()  if link_el  is not None else ""
        # Google News titles often look like: "Gold steadies as ... - Reuters".
        # If we don't have a <source> element, peel the suffix off the title.
        source = (src_el.text or "").strip() if src_el is not None else ""
        if not source and " - " in title:
            title, source = title.rsplit(" - ", 1)
            title = title.strip()
            source = source.strip()

        if title:
            out.append({"title": title, "source": source or "Google News", "url": link or "#"})
        if len(out) >= limit:
            break

    return out
