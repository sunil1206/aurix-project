# ============================================================
# Aurix - One-command developer workflows.
#
# Run `make help` to see what's available.
# All commands are wrappers around docker compose so a contributor
# only needs Docker installed.
# ============================================================

DC          := docker compose
DC_PROD     := docker compose -f docker-compose.prod.yml
EXEC        := $(DC) exec web

.DEFAULT_GOAL := help

.PHONY: help up down restart logs build rebuild ps \
        first-run migrate makemigrations shell dbshell superuser \
        front front-logs front-shell front-install \
        test test-cov lint \
        prod-up prod-down prod-logs \
        clean nuke

help:                ## Show this help.
	@awk 'BEGIN {FS = ":.*##"; printf "Available targets:\n\n"} \
	      /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# --- Lifecycle --------------------------------------------------------------
up:                  ## Start the full dev stack (db + redis + web + frontend).
	$(DC) up -d --build
	@echo "→ Frontend: http://localhost:5173"
	@echo "→ API:      http://localhost:8000/api/health/"

down:                ## Stop the dev stack (volumes preserved).
	$(DC) down

restart:             ## Restart just the web container.
	$(DC) restart web

build:               ## Build images without starting.
	$(DC) build

rebuild:             ## Force a clean rebuild from scratch.
	$(DC) build --no-cache

ps:                  ## List running containers.
	$(DC) ps

logs:                ## Tail web logs.
	$(DC) logs -f web

# --- First run --------------------------------------------------------------
first-run: up        ## Bootstrap: build, migrate, prompt for superuser.
	$(EXEC) python manage.py makemigrations users wallets transactions --noinput || true
	$(EXEC) python manage.py migrate --noinput
	$(EXEC) python manage.py createsuperuser
	@echo ""
	@echo "✓ Aurix is up. Try:"
	@echo "    curl -X POST http://localhost:8000/api/auth/register/ \\"
	@echo "         -H 'Content-Type: application/json' \\"
	@echo "         -d '{\"email\":\"you@example.com\",\"password\":\"Aurix#2026\"}'"

# --- Django management ------------------------------------------------------
migrate:             ## Apply migrations.
	$(EXEC) python manage.py migrate

makemigrations:      ## Generate new migrations from model changes.
	$(EXEC) python manage.py makemigrations

shell:               ## Open a Django shell inside the web container.
	$(EXEC) python manage.py shell

dbshell:             ## Open a psql session against the dev database.
	$(DC) exec db psql -U aurix -d aurix

superuser:           ## Create a superuser interactively.
	$(EXEC) python manage.py createsuperuser

# --- Frontend ---------------------------------------------------------------
front:               ## Tail Vite logs (alias for `make front-logs`).
	$(DC) logs -f frontend

front-logs:          ## Tail Vite (frontend) logs.
	$(DC) logs -f frontend

front-shell:         ## sh inside the frontend container.
	$(DC) exec frontend sh

front-install:       ## Reinstall node_modules inside the container.
	$(DC) exec frontend npm install

# --- Tests ------------------------------------------------------------------
test:                ## Run the pytest suite inside the container.
	$(EXEC) pytest -ra

test-cov:            ## Run tests with coverage report.
	$(EXEC) pytest --cov=apps --cov=services --cov-report=term-missing

lint:                ## Quick syntax check across the source tree.
	$(EXEC) python -m compileall -q apps aurix services

# --- Production parity ------------------------------------------------------
prod-up:             ## Boot the production-shaped stack (gunicorn).
	$(DC_PROD) up -d --build

prod-down:
	$(DC_PROD) down

prod-logs:
	$(DC_PROD) logs -f web

# --- Cleanup ----------------------------------------------------------------
clean:               ## Stop containers and prune dangling images.
	$(DC) down --remove-orphans
	docker image prune -f

nuke:                ## DESTRUCTIVE: delete all containers, volumes, data.
	@printf "This will delete the database. Type 'yes' to continue: " && read ans && [ "$$ans" = "yes" ]
	$(DC) down -v --remove-orphans
