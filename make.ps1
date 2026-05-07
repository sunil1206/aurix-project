<#
.SYNOPSIS
    Aurix - Windows PowerShell equivalent of the Makefile.

.DESCRIPTION
    Mirrors the targets in `Makefile` so Windows users without
    GNU Make installed get the same one-command workflows.

    Usage:
        .\make.ps1 <target> [args...]

    Run `.\make.ps1 help` to see the available targets.

.EXAMPLE
    .\make.ps1 first-run
    .\make.ps1 logs
    .\make.ps1 test
#>

param(
    [Parameter(Position = 0)]
    [string]$Target = 'help',

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$RemainingArgs
)

$ErrorActionPreference = 'Stop'

# Equivalents of the Makefile's $(DC), $(DC_PROD), $(EXEC) variables.
$DC      = @('docker', 'compose')
$DC_PROD = @('docker', 'compose', '-f', 'docker-compose.prod.yml')
$EXEC    = @('docker', 'compose', 'exec', 'web')

function Invoke-Cmd {
    param([string[]]$Cmd)
    Write-Host "→ $($Cmd -join ' ')" -ForegroundColor Cyan
    & $Cmd[0] $Cmd[1..($Cmd.Length - 1)]
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE"
    }
}

function Show-Help {
@"
Aurix - PowerShell task runner

Usage: .\make.ps1 <target>

Lifecycle:
  up                Start the dev stack (db + redis + web with hot reload)
  down              Stop the dev stack (volumes preserved)
  restart           Restart just the web container
  build             Build images without starting
  rebuild           Force a clean rebuild from scratch
  ps                List running containers
  logs              Tail web logs

First run:
  first-run         Bootstrap: build, migrate, prompt for superuser

Django management:
  migrate           Apply migrations
  makemigrations    Generate new migrations from model changes
  shell             Open a Django shell inside the web container
  dbshell           Open a psql session against the dev database
  superuser         Create a superuser interactively

Tests:
  test              Run the pytest suite inside the container
  test-cov          Run tests with coverage report
  lint              Quick syntax check across the source tree

Production parity:
  prod-up           Boot the production-shaped stack (gunicorn)
  prod-down         Stop the production-shaped stack
  prod-logs         Tail production-shaped web logs

Cleanup:
  clean             Stop containers and prune dangling images
  nuke              DESTRUCTIVE: delete all containers, volumes, data

  help              Show this message
"@ | Write-Host
}

switch -Regex ($Target) {

    # --- Lifecycle ----------------------------------------------------------
    '^up$' {
        Invoke-Cmd ($DC + @('up', '-d', '--build'))
        Write-Host "→ http://localhost:8000/api/health/" -ForegroundColor Green
    }
    '^down$'    { Invoke-Cmd ($DC + @('down')) }
    '^restart$' { Invoke-Cmd ($DC + @('restart', 'web')) }
    '^build$'   { Invoke-Cmd ($DC + @('build')) }
    '^rebuild$' { Invoke-Cmd ($DC + @('build', '--no-cache')) }
    '^ps$'      { Invoke-Cmd ($DC + @('ps')) }
    '^logs$'    { Invoke-Cmd ($DC + @('logs', '-f', 'web')) }

    # --- First run ----------------------------------------------------------
    '^first-run$' {
        Invoke-Cmd ($DC + @('up', '-d', '--build'))
        # makemigrations may legitimately produce "no changes" - don't fail on it.
        try {
            Invoke-Cmd ($EXEC + @('python', 'manage.py', 'makemigrations',
                                  'users', 'wallets', 'transactions', '--noinput'))
        } catch {
            Write-Host "  (no new migrations needed)" -ForegroundColor DarkGray
        }
        Invoke-Cmd ($EXEC + @('python', 'manage.py', 'migrate', '--noinput'))
        Invoke-Cmd ($EXEC + @('python', 'manage.py', 'createsuperuser'))

        Write-Host "`n✓ Aurix is up. Try:" -ForegroundColor Green
        Write-Host @'
    curl -X POST http://localhost:8000/api/auth/register/ `
         -H "Content-Type: application/json" `
         -d '{"email":"you@example.com","password":"Aurix#2026"}'
'@
    }

    # --- Django management --------------------------------------------------
    '^migrate$'        { Invoke-Cmd ($EXEC + @('python', 'manage.py', 'migrate')) }
    '^makemigrations$' { Invoke-Cmd ($EXEC + @('python', 'manage.py', 'makemigrations')) }
    '^shell$'          { Invoke-Cmd ($EXEC + @('python', 'manage.py', 'shell')) }
    '^dbshell$'        { Invoke-Cmd ($DC + @('exec', 'db', 'psql', '-U', 'aurix', '-d', 'aurix')) }
    '^superuser$'      { Invoke-Cmd ($EXEC + @('python', 'manage.py', 'createsuperuser')) }

    # --- Tests --------------------------------------------------------------
    '^test$'     { Invoke-Cmd ($EXEC + @('pytest', '-ra')) }
    '^test-cov$' {
        Invoke-Cmd ($EXEC + @('pytest', '--cov=apps', '--cov=services',
                              '--cov-report=term-missing'))
    }
    '^lint$'     { Invoke-Cmd ($EXEC + @('python', '-m', 'compileall', '-q',
                                         'apps', 'aurix', 'services')) }

    # --- Production parity --------------------------------------------------
    '^prod-up$'   { Invoke-Cmd ($DC_PROD + @('up', '-d', '--build')) }
    '^prod-down$' { Invoke-Cmd ($DC_PROD + @('down')) }
    '^prod-logs$' { Invoke-Cmd ($DC_PROD + @('logs', '-f', 'web')) }

    # --- Cleanup ------------------------------------------------------------
    '^clean$' {
        Invoke-Cmd ($DC + @('down', '--remove-orphans'))
        Invoke-Cmd @('docker', 'image', 'prune', '-f')
    }
    '^nuke$' {
        $confirm = Read-Host "This will DELETE the database. Type 'yes' to continue"
        if ($confirm -ne 'yes') {
            Write-Host "Cancelled." -ForegroundColor Yellow
            return
        }
        Invoke-Cmd ($DC + @('down', '-v', '--remove-orphans'))
    }

    # --- Help ---------------------------------------------------------------
    '^(help|--help|-h)?$' { Show-Help }

    default {
        Write-Host "Unknown target: $Target" -ForegroundColor Red
        Write-Host ""
        Show-Help
        exit 1
    }
}
