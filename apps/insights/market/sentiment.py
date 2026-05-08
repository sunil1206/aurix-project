"""
Aurix - Macro sentiment for gold.

Three layers:
    1. News fetch  : Google News RSS for live gold-related headlines.
                     Falls back to a curated mock list if Google is down.
    2. Classifier  : FinBERT (ProsusAI/finbert) if `transformers` + torch
                     are installed; otherwise a simple positive/negative
                     keyword scorer.
    3. Aggregator  : average per-headline (positive - negative) score
                     into a single number in [-1, +1].
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List

from .fixtures.news_seed import GOLD_HEADLINES_FIXTURE
from .news_fetcher import fetch_gold_headlines

logger = logging.getLogger("aurix.market.sentiment")


@dataclass(frozen=True)
class ScoredHeadline:
    title: str
    source: str
    url: str
    score: float


@dataclass(frozen=True)
class SentimentResult:
    score: float
    label: str
    headlines_analyzed: int
    engine: str
    headlines: List[ScoredHeadline] = field(default_factory=list)


def get_news_sentiment(query: str = "gold") -> SentimentResult:
    """Always returns a result with at least the bundled headlines."""
    headlines = fetch_gold_headlines()
    if not headlines:
        # Defensive: fetch_gold_headlines should never return empty now,
        # but we keep this for total network outages.
        headlines = list(GOLD_HEADLINES_FIXTURE)

    # Detect whether the fetcher returned the bundled fixture by comparing
    # titles — the fixture titles are stable.
    fixture_titles = {h["title"] for h in GOLD_HEADLINES_FIXTURE}
    using_live = not all(h["title"] in fixture_titles for h in headlines)

    finbert = _try_finbert(headlines)
    if finbert is not None:
        return _stamp(finbert, live=using_live)
    return _stamp(_lexicon_scorer(headlines), live=using_live)


def _stamp(result: SentimentResult, *, live: bool) -> SentimentResult:
    """Append `+live` to the engine label so the UI can show data freshness."""
    suffix = "+live" if live else "+fallback"
    return SentimentResult(
        score=result.score,
        label=result.label,
        headlines_analyzed=result.headlines_analyzed,
        engine=f"{result.engine}{suffix}",
        headlines=result.headlines,
    )


# --- FinBERT ---------------------------------------------------------------

_FINBERT_PIPELINE = None


def _try_finbert(headlines):
    try:
        from transformers import pipeline  # type: ignore
    except Exception:
        return None
    try:
        clf = _load_finbert(pipeline)
        results = clf([h["title"] for h in headlines])
        scored = []
        for h, per in zip(headlines, results):
            scores = {item["label"].lower(): float(item["score"]) for item in per}
            net = scores.get("positive", 0.0) - scores.get("negative", 0.0)
            scored.append(ScoredHeadline(
                title=h["title"], source=h["source"], url=h["url"], score=round(net, 3),
            ))
        avg = sum(s.score for s in scored) / len(scored) if scored else 0.0
        return SentimentResult(
            score=round(avg, 3),
            label=_label_from_score(avg),
            headlines_analyzed=len(scored),
            engine="finbert",
            headlines=scored,
        )
    except Exception as exc:
        logger.warning("FinBERT failed (%s); using lexicon fallback.", exc)
        return None


def _load_finbert(pipeline_fn):
    global _FINBERT_PIPELINE
    if _FINBERT_PIPELINE is None:
        _FINBERT_PIPELINE = pipeline_fn(
            "sentiment-analysis", model="ProsusAI/finbert", top_k=None,
        )
    return _FINBERT_PIPELINE


# --- Lexicon ---------------------------------------------------------------

POSITIVE_WORDS = {
    "rally","surge","gain","gains","strong","bullish","boost","demand","safe-haven",
    "record","rises","growth","dovish","supportive","outperform","high","haven","cut",
    "soar","jump","soars","climbs","climb","peak","upside","upbeat","buying",
}
NEGATIVE_WORDS = {
    "fall","drop","drops","decline","weak","bearish","selloff","tumbles","slumps",
    "downgrade","dampens","hawkish","tighten","low","fear","tension","tensions",
    "plunge","plunges","sinks","slides","slip","slips","losses","downside","sell",
}


def _lexicon_scorer(headlines):
    scored = []
    for h in headlines:
        words = {w.strip(".,!?;:'\"").lower() for w in h["title"].split()}
        pos = len(words & POSITIVE_WORDS)
        neg = len(words & NEGATIVE_WORDS)
        total = pos + neg
        score = round((pos - neg) / total, 3) if total else 0.0
        scored.append(ScoredHeadline(
            title=h["title"], source=h["source"], url=h["url"], score=score,
        ))

    avg = sum(s.score for s in scored) / len(scored) if scored else 0.0
    return SentimentResult(
        score=round(avg, 3),
        label=_label_from_score(avg),
        headlines_analyzed=len(scored),
        engine="lexicon",
        headlines=scored,
    )


def _label_from_score(score: float) -> str:
    if score > 0.15:  return "positive"
    if score < -0.15: return "negative"
    return "neutral"
