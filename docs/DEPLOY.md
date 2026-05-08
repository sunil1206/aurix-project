# Aurix - Deploy to Digital Ocean

End-to-end guide to ship Aurix at **https://aurix.linustech.in**. The
target stack is a single Ubuntu droplet running Docker Compose, with
Caddy in front of the app for automatic Let's Encrypt SSL. Total
deployment time after the first run: ~5 minutes per code push.

---

## 1. Prerequisites

- Digital Ocean account with billing enabled
- Domain registered for `linustech.in` and DNS managed somewhere you can edit (Cloudflare, Route 53, Namecheap, etc.)
- This repo pushed to GitHub (or any git host the droplet can clone from)
- An SSH key on your local machine — `ssh-keygen -t ed25519` if you don't have one

Optional: an OpenAI API key if you want the LLM analyst. The app works without it (rule-based fallback).

---

## 2. Push the code to GitHub

From your laptop, in the project root:

```bash
git init                                          # if not already a repo
git add .
git commit -m "Initial Aurix release"

# Create an empty repo on GitHub (any visibility), then:
git remote add origin git@github.com:<you>/aurix.git
git branch -M main
git push -u origin main
```

---

## 3. Create the droplet

On Digital Ocean:

1. **Create → Droplets**
2. Region: **Frankfurt 1** (closest to Indian users + EU compliance) or **Bangalore 1**
3. Image: **Ubuntu 24.04 (LTS) x64**
4. Size: **Basic / Regular SSD / 2 GB RAM / 1 vCPU** ($12/mo). Aurix runs comfortably on this; bump to 4GB if you enable FinBERT.
5. Authentication: **SSH key** — paste the public half of the key you generated.
6. Hostname: `aurix-prod`
7. Click **Create**.

After ~30 seconds the droplet has a public IP — note it down (e.g. `134.209.45.123`).

---

## 4. Point DNS at the droplet

In your DNS provider, add an **A record**:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `aurix` | `134.209.45.123` *(your droplet IP)* | 300 |

Verify propagation:

```bash
dig +short aurix.linustech.in
# expected: 134.209.45.123
```

If you get the wrong IP or nothing, wait a few minutes and try again. Caddy needs DNS to resolve before it can issue a cert.

---

## 5. SSH in and install Docker

```bash
ssh root@aurix.linustech.in

# 1. System packages
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg git ufw

# 2. Docker (official repo, the apt-shipped version is too old)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Verify
docker --version              # Docker version 27.x
docker compose version        # Docker Compose version v2.x
```

---

## 6. Firewall

Open only what we need: SSH, HTTP, HTTPS.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow http
ufw allow https
ufw --force enable
ufw status
```

---

## 7. Clone Aurix

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/<you>/aurix.git
cd aurix
```

If you used SSH for GitHub, you'll need a deploy key:

```bash
ssh-keygen -t ed25519 -f /root/.ssh/github_deploy -N ''
cat /root/.ssh/github_deploy.pub
```

Add the printed key as a **deploy key** in your GitHub repo's Settings → Deploy keys (read-only is fine), then:

```bash
cat >> /root/.ssh/config <<'EOF'
Host github.com
  IdentityFile /root/.ssh/github_deploy
  IdentitiesOnly yes
EOF
git remote set-url origin git@github.com:<you>/aurix.git
```

---

## 8. Configure environment

```bash
cp deploy/.env.deploy.example .env
nano .env
```

At minimum, change:

| Variable | Value |
|---|---|
| `SECRET_KEY` | run `openssl rand -base64 50` and paste the output |
| `POSTGRES_PASSWORD` | run `openssl rand -base64 24` |
| `DATABASE_URL` | update the password to match the line above |
| `AURIX_DOMAIN` | `aurix.linustech.in` |
| `ALLOWED_HOSTS` | `aurix.linustech.in` |
| `OPENAI_API_KEY` | optional — paste your key if you want the LLM analyst |

Save (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 9. First-time bring-up

```bash
cd /opt/aurix

docker compose \
  -f docker-compose.prod.yml \
  -f deploy/docker-compose.deploy.yml \
  up -d --build

# Watch the build (first time takes ~3-4 minutes)
docker compose \
  -f docker-compose.prod.yml \
  -f deploy/docker-compose.deploy.yml \
  logs -f
```

You should see, in order:

1. `db` becomes healthy
2. `redis` becomes healthy
3. `web` runs `migrate` then starts gunicorn
4. `frontend` builds and nginx starts
5. `caddy` starts, requests a Let's Encrypt cert, says `certificate obtained successfully`

Press `Ctrl+C` to detach (the stack keeps running).

Smoke test from your laptop:

```bash
curl -I https://aurix.linustech.in
# Expected: HTTP/2 200, with Strict-Transport-Security header

curl https://aurix.linustech.in/api/health/
# Expected: {"status":"ok","service":"aurix"}
```

Open **https://aurix.linustech.in** in a browser — the Aurix login screen should appear with a valid TLS lock.

---

## 10. Create the first superuser

```bash
docker compose \
  -f docker-compose.prod.yml \
  -f deploy/docker-compose.deploy.yml \
  exec web python manage.py createsuperuser
```

---

## 11. Install the systemd unit (auto-start on reboot)

```bash
cp /opt/aurix/deploy/aurix.service /etc/systemd/system/aurix.service
systemctl daemon-reload
systemctl enable aurix
systemctl start aurix
systemctl status aurix
```

The unit also ships an `ExecReload` that does `git pull && docker compose up -d --build`, so deploying a new version is one command:

```bash
systemctl reload aurix
```

---

## 12. The deploy loop (after the first time)

From your laptop:

```bash
git add .
git commit -m "<change>"
git push origin main
```

From the droplet:

```bash
ssh root@aurix.linustech.in 'systemctl reload aurix'
```

That single command pulls the latest code, rebuilds the changed images, and restarts containers in place. Caddy keeps running so users see no SSL hiccup.

### Optional: GitHub Actions auto-deploy

Add this workflow at `.github/workflows/deploy.yml` to deploy on every push to `main`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1.0.0
        with:
          host:     ${{ secrets.DROPLET_HOST }}
          username: root
          key:      ${{ secrets.DROPLET_SSH_KEY }}
          script:   systemctl reload aurix
```

Add `DROPLET_HOST` (= `aurix.linustech.in`) and `DROPLET_SSH_KEY` (= the private half of an SSH key you also added to the droplet's `~/.ssh/authorized_keys`) under repo Settings → Secrets and variables → Actions.

---

## 13. Operations cheat sheet

```bash
# All commands run from /opt/aurix on the droplet.

# Tail logs (replace `web` with caddy / frontend / db / redis)
docker compose -f docker-compose.prod.yml -f deploy/docker-compose.deploy.yml logs -f web

# Django shell
docker compose ... exec web python manage.py shell

# psql against production database
docker compose ... exec db psql -U aurix -d aurix

# Backup the database (run from the droplet)
docker compose ... exec -T db pg_dump -U aurix aurix | gzip > /opt/backups/aurix-$(date +%F).sql.gz

# Restart just one service
docker compose ... restart web

# Stop everything
systemctl stop aurix

# Force a clean rebuild (e.g. after requirements.txt change)
docker compose -f docker-compose.prod.yml -f deploy/docker-compose.deploy.yml build --no-cache web
systemctl reload aurix
```

---

## 14. Files you just shipped

| Path | Role |
|---|---|
| `Dockerfile` | Backend image (Django + gunicorn) |
| `frontend/Dockerfile.prod` | Frontend image (Vite build → nginx) |
| `frontend/nginx.conf` | nginx serving SPA + reverse-proxying `/api/*` to web |
| `docker-compose.prod.yml` | Production-shaped local stack (no TLS) |
| `deploy/docker-compose.deploy.yml` | Adds Caddy in front (TLS termination + HTTP/3) |
| `deploy/Caddyfile` | Caddy config — auto-SSL via Let's Encrypt |
| `deploy/aurix.service` | systemd unit for auto-start + `systemctl reload aurix` deploy hook |
| `deploy/.env.deploy.example` | Env template for production |

---

## 15. Common deploy issues

| Symptom | Cause | Fix |
|---|---|---|
| `ERR_CONNECTION_REFUSED` in browser | Caddy not running, or DNS not propagated | `docker compose logs caddy`; `dig aurix.linustech.in` |
| Caddy: `obtain: error getting certificate` | Port 80 not reachable from internet | `ufw status` — must show 80/tcp ALLOW |
| 502 Bad Gateway | `web` or `frontend` crashed | `docker compose logs frontend`; `docker compose logs web` |
| `relation "users_user" does not exist` | Migrations didn't run | `docker compose ... exec web python manage.py migrate` |
| Charts empty | yfinance + stooq blocked from droplet | The bundled `xaueur_3y.csv` fixture kicks in automatically; check `docker compose logs web | grep aurix.market` |
| News empty | All RSS feeds blocked | The bundled `news_seed.py` fixture kicks in; same story |

---

## 16. Hardening for real production

This guide gets you to "live with TLS in 30 minutes". For a real fintech you'd also want:

- **Off-host database**: DO Managed Postgres ($15/mo) — survives droplet rebuilds, automated backups, point-in-time recovery
- **Separate Redis**: DO Managed Redis or just keep on-droplet for caching only
- **Object storage** for static media: DO Spaces (S3-compatible)
- **Separate frontend hosting**: deploy `frontend/dist/` to Cloudflare Pages or DO App Platform
- **Health monitoring**: UptimeRobot pinging `/api/health/` every minute
- **Log aggregation**: ship container logs to Better Stack / Logtail
- **Error tracking**: set `SENTRY_DSN` in `.env` and `sentry-sdk` is already wired in
- **Backups**: cron the `pg_dump` line above + push to DO Spaces nightly
- **Rate limiting at the edge**: Cloudflare in front of Caddy
- **Secret management**: DO App Platform env injection or HashiCorp Vault, not a flat `.env`

For an evaluation build, the single-droplet setup above is more than sufficient and runs at ~$12/mo.
