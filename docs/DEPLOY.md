# Aurix - Deploy to Digital Ocean (full step-by-step)

End-to-end guide to ship Aurix at **https://aurix.linustech.in** on a single Ubuntu droplet, behind Caddy with auto-SSL, running as a non-root `deploy` user.

Estimated time end-to-end: **30–45 minutes** the first time, **30 seconds** for every subsequent code push.

---

## Step 0 — What you need before you start

- A Digital Ocean account
- The domain `linustech.in` with editable DNS
- Your code pushed to GitHub at `https://github.com/<you>/aurix-project`
- An SSH key on your local machine (run `ssh-keygen -t ed25519` if you don't have one — accept defaults)

---

## Step 1 — Create the droplet

On Digital Ocean → **Create → Droplets**:

| Setting | Value |
|---|---|
| Region | Bangalore 1 (or Frankfurt 1 if you want EU) |
| Image | Ubuntu 24.04 (LTS) x64 |
| Size | Basic / Regular SSD / **2 GB RAM / 1 vCPU** ($12/mo) |
| Authentication | **SSH key** — paste the contents of your `~/.ssh/id_ed25519.pub` |
| Hostname | `aurix-prod` |

Click **Create**. After ~30 seconds note the public IP (e.g. `134.209.45.123`).

---

## Step 2 — Point DNS at the droplet

In your DNS provider (Cloudflare / Route 53 / Namecheap / wherever you manage `linustech.in`), add:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `aurix` | `134.209.45.123` *(your droplet IP)* | 300 |

If using Cloudflare, set the proxy status to **DNS only** (grey cloud) — Caddy needs to issue its own certificate and the orange cloud would interfere.

Wait for propagation (usually 1–5 min), then verify from your laptop:

```powershell
nslookup aurix.linustech.in
# Expected: Address: 134.209.45.123
```

---

## Step 3 — First SSH in as root (one time only)

```powershell
ssh root@aurix.linustech.in
```

Accept the host key when prompted. You're now logged into the droplet as root. Update everything once:

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg git ufw sudo
```

---

## Step 4 — Create the `deploy` user

This is the user the app will run under. **No more root access from this point on.**

```bash
# Create the user with a home dir + bash shell
adduser --disabled-password --gecos "" deploy

# Give them passwordless sudo (CI/CD friendly)
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy

# Copy the SSH key from root → deploy so you can log in directly
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Verify from your laptop in **a new terminal** (don't close the root one yet):

```powershell
ssh deploy@aurix.linustech.in 'whoami && id'
# Expected:
#   deploy
#   uid=1000(deploy) gid=1000(deploy) groups=1000(deploy)
```

If this works, switch all future SSH to `deploy@`. The root session can be exited.

---

## Step 5 — Lock down SSH (optional but recommended)

Still as root (last thing you'll do as root):

```bash
# Disable root login + password auth
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
exit
```

From now on you log in only as `deploy@aurix.linustech.in` with your SSH key.

---

## Step 6 — Install Docker (as deploy)

```bash
ssh deploy@aurix.linustech.in
```

Inside the droplet:

```bash
# Docker official repo (apt-shipped version is too old)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Let `deploy` run docker without sudo
sudo usermod -aG docker deploy

# Re-login so the new group takes effect
exit
```

Log back in:

```powershell
ssh deploy@aurix.linustech.in
```

Verify:

```bash
docker --version              # Docker version 27.x
docker compose version        # Docker Compose version v2.x
docker run --rm hello-world   # should print "Hello from Docker!"
```

---

## Step 7 — Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable
sudo ufw status verbose
```

Expected: `22/tcp ALLOW IN`, `80/tcp ALLOW IN`, `443/tcp ALLOW IN`. Everything else denied.

---

## Step 8 — Clone Aurix into `/opt/aurix`

`/opt` is the conventional location for site-specific software. We give the `deploy` user ownership.

```bash
sudo mkdir -p /opt/aurix
sudo chown deploy:deploy /opt/aurix

# Public repo? Just clone over HTTPS:
git clone https://github.com/sunil1206/aurix-project.git /opt/aurix

# Private repo? Generate a deploy key first:
#   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ''
#   cat ~/.ssh/github_deploy.pub
# Add the printed key to your GitHub repo's
#   Settings → Deploy keys (Read access is fine).
# Then clone with SSH:
#   GIT_SSH_COMMAND='ssh -i ~/.ssh/github_deploy' \
#     git clone git@github.com:sunil1206/aurix-project.git /opt/aurix

cd /opt/aurix
ls       # should show docker-compose.yml, deploy/, frontend/, apps/, ...
```

---

## Step 9 — Configure environment

```bash
cd /opt/aurix
cp deploy/.env.deploy.example .env
nano .env
```

Change these values **at minimum**:

| Variable | How to get a value |
|---|---|
| `SECRET_KEY` | run `openssl rand -base64 50` in a separate shell, paste output |
| `POSTGRES_PASSWORD` | run `openssl rand -base64 24`, paste output |
| `DATABASE_URL` | replace `CHANGE_THIS_STRONG_PASSWORD` with the password above |
| `AURIX_DOMAIN` | leave as `aurix.linustech.in` |
| `ALLOWED_HOSTS` | leave as `aurix.linustech.in` |
| `CORS_ALLOWED_ORIGINS` | leave as `https://aurix.linustech.in` |
| `OPENAI_API_KEY` | optional — paste your key for the LLM analyst, or leave blank for the rule-based fallback |

Save: `Ctrl+O`, `Enter`, `Ctrl+X`.

```bash
chmod 600 .env       # only deploy can read it
```

---

## Step 10 — First boot

```bash
cd /opt/aurix

docker compose \
  -f docker-compose.prod.yml \
  -f deploy/docker-compose.deploy.yml \
  up -d --build

# Watch the logs (first time takes 3–6 minutes — pip + npm install)
docker compose \
  -f docker-compose.prod.yml \
  -f deploy/docker-compose.deploy.yml \
  logs -f
```

You should see, in order:

```
db        | database system is ready to accept connections
redis     | Ready to accept connections tcp
web       | [entrypoint] Applying database migrations...
web       | [entrypoint] Starting: gunicorn aurix.wsgi:application ...
frontend  | nginx/1.27.x ready to handle connections
caddy     | certificate obtained successfully  <— this is the magic line
```

Press `Ctrl+C` to detach (containers keep running).

---

## Step 11 — Smoke test

From your laptop:

```powershell
curl -I https://aurix.linustech.in
# Expected: HTTP/2 200, with Strict-Transport-Security header

curl https://aurix.linustech.in/api/health/
# Expected: {"status":"ok","service":"aurix"}
```

Open **https://aurix.linustech.in** in a browser — the Aurix login page appears with a valid TLS lock. If you see "Your connection is not private", Caddy is still negotiating the certificate; wait 30 seconds and refresh.

---

## Step 12 — Create the first superuser

```bash
docker compose \
  -f docker-compose.prod.yml \
  -f deploy/docker-compose.deploy.yml \
  exec web python manage.py createsuperuser
```

Enter your email + password. Use this account to log into the SPA.

---

## Step 13 — Auto-start on reboot (systemd)

```bash
sudo cp /opt/aurix/deploy/aurix.service /etc/systemd/system/aurix.service

# The unit references /opt/aurix and runs as root by default.
# We want it to run as the `deploy` user instead — patch it:
sudo sed -i '/^\[Service\]/a User=deploy\nGroup=deploy' /etc/systemd/system/aurix.service

# Activate
sudo systemctl daemon-reload
sudo systemctl enable aurix
sudo systemctl start aurix
sudo systemctl status aurix
```

The unit ships an `ExecReload` that does `git pull && docker compose up -d --build`, so deploying becomes one command.

---

## Step 14 — The deploy loop

From your laptop:

```powershell
cd D:\startup\aurix
git add .
git commit -m "<change>"
git push origin main
```

From anywhere with your SSH key:

```powershell
ssh deploy@aurix.linustech.in 'sudo systemctl reload aurix'
```

This:
1. Pulls the latest commit from GitHub
2. Rebuilds whatever images changed (frontend / backend)
3. Restarts containers in place

Caddy keeps serving throughout — users don't see a TLS hiccup.

### Optional — GitHub Actions auto-deploy

Add `.github/workflows/deploy.yml`:

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
          host:     ${{ secrets.DROPLET_HOST }}      # aurix.linustech.in
          username: deploy
          key:      ${{ secrets.DROPLET_SSH_KEY }}   # private half of an SSH key
          script:   sudo systemctl reload aurix
```

In GitHub repo → **Settings → Secrets and variables → Actions**, add:
- `DROPLET_HOST` = `aurix.linustech.in`
- `DROPLET_SSH_KEY` = contents of an SSH private key whose public half is in `/home/deploy/.ssh/authorized_keys`

Now every push to `main` auto-deploys.

---

## Step 15 — Day-2 operations cheat sheet

All commands run as `deploy` from `/opt/aurix`.

```bash
# Tail any service's logs
docker compose -f docker-compose.prod.yml -f deploy/docker-compose.deploy.yml logs -f web
docker compose ... logs -f frontend
docker compose ... logs -f caddy

# Django shell
docker compose ... exec web python manage.py shell

# Postgres shell
docker compose ... exec db psql -U aurix -d aurix

# Backup the DB (run a cron of this — see step 16)
docker compose ... exec -T db pg_dump -U aurix aurix | gzip > ~/backups/aurix-$(date +%F).sql.gz

# Restart just the web container
docker compose ... restart web

# Stop everything (systemd-managed)
sudo systemctl stop aurix

# Clean rebuild after requirements.txt changes
docker compose -f docker-compose.prod.yml -f deploy/docker-compose.deploy.yml build --no-cache
sudo systemctl reload aurix
```

---

## Step 16 — Nightly backups

```bash
mkdir -p ~/backups

# Add to crontab — runs every night at 2am
( crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/aurix && \
  docker compose -f docker-compose.prod.yml -f deploy/docker-compose.deploy.yml \
  exec -T db pg_dump -U aurix aurix | gzip > /home/deploy/backups/aurix-\$(date +\\%F).sql.gz && \
  find /home/deploy/backups -name 'aurix-*.sql.gz' -mtime +14 -delete" ) | crontab -

# Verify
crontab -l
```

Backups older than 14 days are auto-pruned. To restore:

```bash
gunzip < ~/backups/aurix-2026-05-07.sql.gz | \
  docker compose ... exec -T db psql -U aurix -d aurix
```

---

## Step 17 — Common deploy issues

| Symptom | Cause | Fix |
|---|---|---|
| `ssh deploy@... Permission denied` | SSH key not in `/home/deploy/.ssh/authorized_keys` | Re-run the `cp /root/.ssh/...` lines in Step 4 |
| `docker: permission denied while trying to connect` | `deploy` not in the `docker` group yet | `sudo usermod -aG docker deploy` then exit and re-SSH |
| Caddy: `obtain: getting certificate: ... timeout` | Port 80 not reachable from internet | `sudo ufw status` — must show 80/tcp; verify droplet's public firewall in DO panel too |
| Browser shows "ERR_CONNECTION_REFUSED" | Caddy crashed or DNS hasn't propagated | `docker compose ... logs caddy`; `dig aurix.linustech.in` from your laptop |
| 502 Bad Gateway | `web` or `frontend` container died | `docker compose ... ps` then logs of whichever is `Restarting` |
| `relation "users_user" does not exist` | Migrations didn't run | `docker compose ... exec web python manage.py migrate` |
| Charts empty | yfinance + stooq blocked from droplet | Bundled `xaueur_3y.csv` kicks in automatically; check `docker compose ... logs web | grep aurix.market` to confirm |
| News empty | All RSS feeds blocked | Bundled `news_seed.py` kicks in; check `docker compose ... logs web | grep aurix.market.news` |
| `git pull rejected` | Local commits on the droplet diverged from main | `cd /opt/aurix && git reset --hard origin/main` (DESTRUCTIVE — only safe because you don't edit on the droplet) |

---

## Step 18 — Hardening for real production

This guide gets you to "live with TLS, auto-deploy, backups, non-root user, locked-down SSH" in under 45 minutes. For a real fintech product you'd then add:

- **DO Managed Postgres** ($15/mo) — survives droplet rebuilds, point-in-time recovery, automatic backups
- **DO Managed Redis** — same idea
- **DO Spaces** — S3-compatible object storage for uploads + nightly DB dumps
- **Cloudflare** in front of Caddy — DDoS protection + WAF + global edge cache
- **UptimeRobot** pinging `/api/health/` every minute
- **Sentry** for error tracking (set `SENTRY_DSN` in `.env`; it's already wired in `aurix/settings/production.py`)
- **Better Stack / Logtail** for log aggregation
- **HashiCorp Vault** or DO App Platform secrets — replace the flat `.env`

---

## Quick reference card

```
Domain        : aurix.linustech.in
Droplet user  : deploy@aurix.linustech.in (passwordless sudo, in docker group)
App location  : /opt/aurix (owned by deploy:deploy)
Env file      : /opt/aurix/.env (chmod 600)
Compose files : docker-compose.prod.yml + deploy/docker-compose.deploy.yml
Service       : aurix.service (systemctl reload aurix to deploy)
Logs          : docker compose ... logs -f <service>
Backups       : /home/deploy/backups/aurix-YYYY-MM-DD.sql.gz (nightly cron)
```
