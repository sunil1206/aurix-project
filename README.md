# Aurix — AI-Enabled Digital Gold Microservice

A production-grade backend for a fintech wallet that lets users buy, sell and reason about their digital gold position. Built with **Django 5 + DRF**, **JWT auth**, **PostgreSQL**, **Redis**, and a pluggable **insights engine** that defaults to deterministic rules and can optionally hand off to an LLM.

---

## 1. Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                          React SPA (frontend/)                 │
│   Auth · Dashboard · Trade Engine · Ledger · AI Insights       │
└──────────────────────────┬─────────────────────────────────────┘
                           │  HTTPS  +  Bearer JWT
┌──────────────────────────▼─────────────────────────────────────┐
│                     Django + DRF (web)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  users app   │  │  wallets app │  │    transactions app  │  │
│  │  JWT, signup │  │  balances    │  │  buy / sell service  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                     │              │
│         └─────────────┬───┴─────────────────────┘              │
│                       │                                        │
│              ┌────────▼─────────┐    ┌────────────────────┐    │
│              │   insights app   │───▶│  rule engine       │    │
│              │   (analyze user) │    │  llm engine (opt.) │    │
│              └────────┬─────────┘    └────────────────────┘    │
│                       │                                        │
│  ┌────────────────────▼──────────────────────────────────────┐ │
│  │  core/            services/                               │ │
│  │  • exception      • price_service (cached gold feed)      │ │
│  │    handler        • cache helpers                         │ │
│  │  • middleware     • (future) notification, ledger export  │ │
│  │  • pagination                                             │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────┬───────────────────────────────────────────┬───────────┘
         │                                           │
   ┌─────▼──────┐                              ┌─────▼──────┐
   │ PostgreSQL │                              │   Redis    │
   │  (durable) │                              │ (cache +   │
   │            │                              │ rate-limit)│
   └────────────┘                              └─────┬──────┘
                                                     │
                                            ┌────────▼────────┐
                                            │ External APIs   │
                                            │ • stooq.com     │
                                            │ • yfinance      │
                                            │ • Google News   │
                                            │ • OpenAI (opt.) │
                                            └─────────────────┘
```

### Layered design

| Layer | Responsibility | Lives in |
|---|---|---|
| **Routes** | URL → view dispatch, auth, throttling | `apps/<app>/urls.py`, `views.py` |
| **Views** | Thin DRF views, request validation | `apps/<app>/views.py` |
| **Serializers** | Input/output schema, field validation | `apps/<app>/serializers.py` |
| **Services** | All business logic, transaction boundaries | `apps/<app>/services.py`, `services/` |
| **Models** | ORM, persistence, invariants | `apps/<app>/models.py` |
| **Engines** | Pluggable strategies (insights) | `apps/insights/engines/` |
| **Middleware** | Cross-cutting concerns (errors, request id) | `apps/core/middleware.py` |

The cardinal rule: **views never touch the ORM directly for writes.** They call services. Services own atomicity, validation and side effects.

---

## 2. Database schema

```
┌──────────────┐         ┌─────────────────┐         ┌─────────────────────┐
│    User      │ 1 ───── 1│    Wallet       │ 1 ───── *│    Transaction      │
│──────────────│         │─────────────────│         │─────────────────────│
│ id           │         │ id              │         │ id                  │
│ email (uniq) │         │ user_id (FK)    │         │ wallet_id (FK)      │
│ password     │         │ eur_balance     │         │ type (BUY|SELL)     │
│ created_at   │         │ gold_grams      │         │ eur_amount          │
│              │         │ created_at      │         │ gold_amount         │
│              │         │ updated_at      │         │ price_per_gram      │
│              │         │                 │         │ created_at          │
└──────────────┘         └─────────────────┘         └─────────────────────┘
```

All monetary fields use `DecimalField` with explicit precision — never floats.

| Field | Type | Precision | Why |
|---|---|---|---|
| `eur_balance` | Decimal | 18,2 | Cents precision, supports very large balances |
| `gold_grams` | Decimal | 18,6 | Sub-milligram precision |
| `price_per_gram` | Decimal | 12,4 | 4 decimals matches XAU quotes |

A `CHECK` constraint guarantees `eur_balance >= 0` and `gold_grams >= 0` at the DB level — defence in depth alongside the service-layer checks.

---

## 3. Setup

### Prerequisites

- **Docker + Docker Compose** (recommended path — only thing you need)
- Or, for a no-Docker setup: Python 3.11+, PostgreSQL 14+ (optional, SQLite works for dev), Redis 6+ (optional, falls back to in-memory)

### Quickstart (Docker)

```bash
git clone <repo>
cd aurix
cp .env.example .env       # Windows: copy .env.example .env

make first-run             # build + migrate + create superuser
```

That single `make first-run` boots Postgres, Redis, and the Django web service with hot reload, applies migrations, and prompts for an admin user. The API is now live at `http://localhost:8000/api/`. Run `make help` to see the rest.

Day-to-day:

```bash
make up         # start the stack (detached)
make logs       # tail web logs
make test       # run pytest inside the container
make shell      # Django shell
make dbshell    # psql against the dev database
make down       # stop (volumes preserved)
```

To verify the production-shaped stack (gunicorn, no source mount, production settings) works before deploying:

```bash
make prod-up
```

### Setup (no Docker)

```bash
python -m venv venv && source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py makemigrations users wallets transactions
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Tests

```bash
make test                       # via Docker
# — or —
pytest                          # all
pytest -m "not integration"     # skip external API calls
pytest --cov=apps --cov=services
```

### Docker layout

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build, non-root runtime, `entrypoint.sh` orchestration |
| `entrypoint.sh` | Waits for Postgres → migrates → collectstatic → execs the CMD |
| `.dockerignore` | Keeps the build context small and prevents leaking `.env` / `db.sqlite3` |
| `docker-compose.yml` | Dev stack: Postgres + Redis + web with `runserver` and bind-mounted source |
| `docker-compose.prod.yml` | Same services but web runs gunicorn from the baked image |
| `Makefile` | One-command wrappers around all of the above |

---

## 4. API reference

Base URL: `http://localhost:8000/api/`. All authenticated endpoints expect `Authorization: Bearer <access_token>`.

### Auth

| Method | Endpoint | Body | Response |
|---|---|---|---|
| `POST` | `/auth/register/` | `{ "email", "password" }` | `201` user + tokens, wallet auto-created with €1000 |
| `POST` | `/auth/login/` | `{ "email", "password" }` | `200` `{ access, refresh }` |
| `POST` | `/auth/refresh/` | `{ "refresh" }` | `200` `{ access }` |

### Wallet

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/wallet/` | Current user's balances + EUR-equivalent gold value |

### Transactions

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/transactions/buy/` | `{ "eur_amount": 100 }` | Convert EUR → gold at the live price |
| `POST` | `/transactions/sell/` | `{ "gold_amount": 0.5 }` | Convert gold → EUR at the live price |
| `GET` | `/transactions/` | – | Paginated history, newest first |

### Insights

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/insights/` | Behavioural insights for the authenticated user |
| `GET` | `/insights/<user_id>/` | Admin-only: insights for another user |

### Ops

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health/` | Liveness probe — DB + cache reachability |
| `GET` | `/price/` | Current cached gold price (EUR/gram) |

### Sample requests

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"sunil@example.com","password":"Aurix#2026"}'

# Buy 200 EUR worth of gold
curl -X POST http://localhost:8000/api/transactions/buy/ \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"eur_amount":"200.00"}'

# Read insights
curl -H "Authorization: Bearer $ACCESS" http://localhost:8000/api/insights/
```

### Sample responses

```jsonc
// POST /api/auth/register/
{
  "user": { "id": 1, "email": "sunil@example.com" },
  "tokens": { "access": "eyJ...", "refresh": "eyJ..." },
  "wallet": { "eur_balance": "1000.00", "gold_grams": "0.000000" }
}

// POST /api/transactions/buy/
{
  "id": 17,
  "type": "BUY",
  "eur_amount": "200.00",
  "gold_amount": "3.058104",
  "price_per_gram": "65.4000",
  "created_at": "2026-05-05T10:31:42.118Z",
  "wallet_after": { "eur_balance": "800.00", "gold_grams": "3.058104" }
}

// GET /api/insights/
{
  "user_id": 1,
  "engine": "rule",
  "generated_at": "2026-05-05T10:35:00Z",
  "summary": "You're buying ~8% above your 30-day average price. Consider waiting for a dip.",
  "reasoning": [
    "12 buys in the last 30 days at avg €68.10/g",
    "Current price €65.40/g is 4% below your average",
    "Last 5 buys were within 2% of each other (DCA pattern)"
  ],
  "metrics": {
    "buys_30d": 12,
    "sells_30d": 1,
    "avg_buy_price": "68.10",
    "current_price": "65.40",
    "net_position_grams": "3.058104"
  }
}
```

---

## 5. Live data sources

Aurix consumes two free, public, no-API-key feeds:

| Concern | Default provider | Why | Fallback |
|---|---|---|---|
| Spot price + 3-year history | **stooq.com** CSV | Free, public, no auth, used by quant traders for years | yfinance (XAUEUR=X → GC=F + EURUSD=X → IAU/GLD ETF + FX) |
| Macro news headlines | **Google News RSS** | Aggregates Reuters / Bloomberg / FT / WSJ / MarketWatch, no key | Curated 5-headline mock list |

Switch providers by setting `PRICE_PROVIDER` in `.env` to `stooq`, `yfinance`, `mock`, `goldapi`, or `metalsdev`. The price service caches in Redis for 60 seconds; historical data caches for 5 minutes. News headlines cache for 10 minutes. If a provider raises an error mid-flight, the service does **not** serve a stale value — it raises `PriceUnavailable` so the trade endpoint returns 503.

## 6. How insights are generated

The insights layer is a **strategy pattern** with two interchangeable engines, both implementing `BaseInsightEngine`:

1. **Rule engine** (default). Pulls a metrics snapshot — 30-day buy/sell counts, average buy price vs. current price, days since last activity, net position direction, repetition pattern — and walks an ordered ruleset:
   - Dormant user → "No activity in N days, prices have moved X% since your last trade."
   - High-frequency buyer above average price → "You're buying frequently above your average."
   - Steady DCA pattern → "You're dollar-cost averaging — consistent buys within 2%."
   - Liquidating position → "You've sold X% of your gold this week."
   - First-time user → "Welcome. Start with a small buy to learn the flow."

   The first matching rule wins. Reasoning is a transparent list of the metrics that triggered it.

2. **LLM engine** (optional, behind `INSIGHT_ENGINE=llm`). Builds the same metrics snapshot but feeds it to an OpenAI chat completion with a strict system prompt: *"You are a fintech advisor. Generate one short, friendly insight from these metrics. Do not invent numbers. Output JSON: { summary, reasoning[] }."* If the API call fails or the response can't be parsed, the engine **falls back to the rule engine** so the endpoint never breaks.

The metrics layer is shared, so swapping engines or A/B-testing them is a one-line config change.

---

## 7. Scaling approach

Today the service is a single Django process. To take it to thousands of users:

- **Horizontal web tier.** Gunicorn already runs multiple workers; put N stateless containers behind a load balancer (ALB / Cloud Run / Fly Machines).
- **Postgres primary + read replicas.** Insights and history are read-heavy, so route those queries to a replica via Django's database router. Writes (`buy`, `sell`) stay on the primary.
- **Row-level locking is already in place.** `select_for_update()` inside `transaction.atomic()` makes concurrent buys on the same wallet safe.
- **Cache the gold price aggressively.** A single Redis key with a 60s TTL is read by every trade; we never hammer the upstream feed.
- **Move heavy work async.** Insight generation (especially LLM calls) and email confirmations belong on Celery + Redis — the API stays snappy.
- **Materialize an analytics view.** Once the ledger has millions of rows, compute per-user 30-day metrics nightly into a `wallet_metrics` table so insights are O(1) instead of O(n) per request.
- **Per-user rate limits.** DRF throttling + a Redis backend caps abuse; trade endpoints get a stricter bucket than reads.
- **Idempotency keys** on `buy`/`sell` (header `Idempotency-Key`) prevent double-charges on client retries.
- **Outbox pattern** for downstream events (notifications, ledger export to S3) keeps writes consistent without distributed transactions.

---

## 8. What I'd improve with more time

- **Real money rails** — Stripe / Open Banking for EUR top-ups and withdrawals (currently the €1000 is a starting gift).
- **KYC / AML** flow with a provider like Onfido or Sumsub — required to ship a real fintech.
- **Idempotent trade endpoints** with an `idempotency_keys` table.
- **Order book vs. instant trade.** Today every trade fills at the cached spot. A real product would let users place limit orders.
- **Background insight refresh.** Pre-compute and cache insights nightly; serve from cache; recompute on demand only after new transactions.
- **Webhooks** for price-alert subscriptions ("notify me if gold drops below €60").
- **OpenAPI spec** auto-generated via `drf-spectacular` so the React app gets typed clients for free.
- **End-to-end tests** with pytest + an httpx client hitting a Postgres test container.
- **Audit log** — append-only table of every state change, separate from the ledger, for compliance.
- **Structured logging + tracing** — JSON logs, OpenTelemetry, propagate request_id through services.

---

## 9. Project layout

```
aurix/
├── manage.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md
├── aurix/                       # Django project
│   ├── settings/
│   │   ├── base.py              # shared
│   │   ├── development.py       # SQLite, DEBUG=True
│   │   └── production.py        # Postgres, security hardening
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   ├── users/                   # auth + JWT + custom user
│   ├── wallets/                 # balance reads
│   ├── transactions/            # buy/sell + history (atomic services)
│   ├── insights/                # behavioural analysis
│   │   └── engines/             # rule_engine.py, llm_engine.py
│   └── core/                    # exceptions, middleware, pagination
├── services/                    # cross-app shared services
│   ├── price_service.py         # cached gold feed (mock | goldapi | metalsdev)
│   └── cache.py
├── frontend/
│   └── App.jsx                  # React SPA reference (Tailwind + lucide)
└── docs/
    └── ARCHITECTURE.md          # deeper design notes
```

---

## 10. License

MIT — built as a technical evaluation for the Aurix role.
<img width="1201" height="831" alt="image" src="https://github.com/user-attachments/assets/66725fcf-f499-4a32-a17f-877487977461" />
<img width="1883" height="810" alt="image" src="https://github.com/user-attachments/assets/ef73e1d3-5a24-492e-b473-4e8c0a2201ee" />
<img width="1889" height="890" alt="image" src="https://github.com/user-attachments/assets/bca0e899-b1f3-4e4b-819a-1e323a798d16" />
<img width="1901" height="893" alt="image" src="https://github.com/user-attachments/assets/3eddeccb-c7f7-435c-a325-51e3b5e4e2ae" />
<img width="1885" height="880" alt="image" src="https://github.com/user-attachments/assets/3b4ee9b4-2a3b-4f3e-b33f-88bc015cef18" />








