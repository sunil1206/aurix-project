# Aurix - Architecture Notes

This document expands the high-level diagram in the README with the design rationale behind specific choices. Read it after the README, not before.

---

## 1. Why Django + DRF?

The brief allowed FastAPI or Django. Django wins here because:

- **Batteries included.** Auth, admin, ORM, migrations, signals, throttling — all built in. A 24-hour build can't afford to reinvent any of this.
- **Mature ORM with `select_for_update`.** Critical for the trade endpoints; FastAPI users would reach for SQLAlchemy and end up writing the same code.
- **Django REST Framework** gives us serializers, pagination, throttling and JWT integration as first-class concerns. With `drf-spectacular` (future work) we get an OpenAPI spec for free.

---

## 2. Layering

The cardinal rule: **views never own business logic, never own atomicity, never run multi-step ORM mutations**. They:

1. Validate input (via a serializer).
2. Call a service function.
3. Serialize the result.

That gives us four properties:

| Property | Why it matters |
|---|---|
| Services are testable in isolation | Tests don't need an HTTP layer or auth setup |
| Services are reusable | The admin, a Celery task, or a CLI script can call them without going through HTTP |
| Side effects are concentrated | Race conditions, atomic boundaries and external API calls all live in `services.py` files — easy to audit |
| Views stay tiny | New endpoints are mostly serializer + 3 lines of view code |

---

## 3. Money & decimal arithmetic

Every monetary or quantity field uses `Decimal`. Floats are banned. Specifically:

- `Wallet.eur_balance`: `Decimal(18, 2)` — cents.
- `Wallet.gold_grams`: `Decimal(18, 6)` — sub-milligram.
- `Transaction.price_per_gram`: `Decimal(12, 4)` — matches XAU quote precision.

Conversion in `transactions.services` uses explicit rounding:

- Buys round gold *down* (`ROUND_DOWN`) to avoid crediting the user more than they paid for.
- Sells round EUR proceeds to nearest cent (`ROUND_HALF_UP`) — the user's "to spend" amount is in their favour.

---

## 4. Concurrency model

Two users buying simultaneously is fine — they touch different wallet rows.

Two **clients of the same user** buying simultaneously (a duplicate request, a tab refresh, a mobile + web combo) must not double-spend. We guarantee that by:

```python
@transaction.atomic
def _execute_trade(...):
    wallet = Wallet.objects.select_for_update().get(user=user)
    # ... validate, mutate, save, write ledger row ...
```

Postgres takes a **row-level write lock** on the wallet for the duration of the transaction. The second concurrent request blocks until the first commits, then re-reads the (now-updated) balance and either succeeds or hits `InsufficientFunds`. Either way, balances stay consistent.

For an even stronger guarantee in a future iteration, we'd accept an `Idempotency-Key` HTTP header and store recent keys in Redis with the original response, so retried requests return the original transaction instead of attempting a new one.

---

## 5. The price service is critical infrastructure

Every trade reads the current price. If we hit the upstream API per request:

- We get rate-limited within minutes.
- We pay per-call.
- We add 100–500ms of latency to every trade.
- We risk inconsistent prices between two near-simultaneous trades.

Solution: a single Redis key `aurix:price:xau_eur_per_gram` with a 60-second TTL. `services.cache.get_or_set` is atomic enough for our needs (`cache.get_or_set` under Redis uses a `SETNX` semantics).

### Provider chain

| Step | Provider | Why | Notes |
|---|---|---|---|
| 1 | **stooq.com** CSV | Free, public, no auth, decades of history | Default — `PRICE_PROVIDER=stooq` |
| 2 | yfinance `XAUEUR=X` | Direct EUR spot quote | Yahoo often rate-limits cloud IPs |
| 3 | yfinance `GC=F` + `EURUSD=X` | Gold futures + FX | Most reliable Yahoo path |
| 4 | yfinance `XAUUSD=X` + `EURUSD=X` | Spot USD + FX | When futures are stale |
| 5 | yfinance `IAU` / `GLD` ETF + `EURUSD=X` | Most liquid daily series | Last-resort tracker |

If the upstream feed fails, we **do not** return a stale value. `PriceUnavailable` propagates up and the trade endpoint returns 503. This is intentional — pricing a financial transaction off a stale quote is worse than failing the trade.

### News headlines (FinBERT input)

Macro headlines come from **Google News RSS** (`apps/insights/market/news_fetcher.py`):

- Endpoint: `https://news.google.com/rss/search?q=...`
- Free, no API key, aggregates Reuters / Bloomberg / FT / WSJ / MarketWatch
- Cached in Redis for 10 minutes
- On any failure → falls back to a curated 5-headline mock list

Headlines flow through FinBERT (if `transformers` is installed) or the lexicon scorer, then average into the composite sentiment in `[-1, +1]`. The engine label appended to the response is `"finbert+live"`, `"finbert+fallback"`, `"lexicon+live"`, or `"lexicon+fallback"` — so the UI knows whether the data is real or fixture.

---

## 6. Insights: deterministic by default, AI when configured

Two engines, one shared metrics snapshot:

```
   ledger ─► services.collect_metrics ─► UserMetrics (frozen dataclass)
                                            │
                                            ├─► RuleInsightEngine  (default)
                                            │       priority-ordered rules,
                                            │       transparent reasoning
                                            │
                                            └─► LLMInsightEngine   (opt-in)
                                                    OpenAI chat completion,
                                                    falls back to rule engine
                                                    on any failure
```

Both engines return the same `Insight` dataclass, so the view layer doesn't know or care which one ran. Toggling `INSIGHT_ENGINE=llm` in `.env` is the only switch.

**Why is the LLM not the default?**

- It costs money per call.
- It's non-deterministic — bad for tests.
- It can hallucinate numbers — bad for fintech.

So the safe default is rules; the LLM is the optional "wow" layer. For users in production we'd cache LLM responses for 1 hour per user to control cost.

---

## 7. Error envelope

Every error response — whether from an `AurixError`, a DRF validation failure, or an unhandled `APIException` — is reshaped by `apps.core.exceptions.aurix_exception_handler` into:

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Wallet does not have enough EUR for this trade.",
    "details": {"available_eur": "12.50", "requested_eur": "200.00"},
    "request_id": "abc123"
  }
}
```

`request_id` is set by `RequestIDMiddleware` and echoed in the `X-Request-ID` response header. Copy-paste it into a log query and you find the full trace. This is non-negotiable for any system that touches money.

---

## 8. Throttling

DRF's built-in throttling is enough for v1:

- Anonymous: 30 req/min (just enough for the auth flow)
- Authenticated: 120 req/min (general use)
- Trade endpoints: 20 req/min (tighter — abuse here costs real money via upstream API calls)

In production this would be backed by Redis (already wired in `settings.production`) and we'd add a per-IP layer at the load balancer.

---

## 9. Test strategy

Pytest-django is configured (`pytest.ini`). The high-value tests to write next, in order:

1. `transactions/tests.py` — buy_gold, sell_gold happy paths, insufficient funds, race condition (two greenlets buying at once).
2. `insights/tests.py` — feed handcrafted `UserMetrics` into `RuleInsightEngine`, assert the right rule fires.
3. `users/tests.py` — registration creates a wallet via signal; JWT round-trip.
4. Integration: `TestClient` against `/api/auth/register/ → /api/transactions/buy/ → /api/transactions/`.

Mark anything that hits an external HTTP service with `@pytest.mark.integration` so CI can skip them.

---

## 10. What this design doesn't do (and why)

- **No order book.** Every trade fills at the cached spot. Real exchanges have a book; this is a wallet, not a venue.
- **No KYC.** A real fintech can't ship without identity verification (Onfido, Sumsub). Out of scope for an evaluation build.
- **No real money rails.** The €1000 starting balance is a gift. Stripe + Open Banking would replace this.
- **No async tasks.** Insights run inline. With LLM calls in the mix, they belong on Celery + Redis. One day's work, but not the most important next step.
