#!/usr/bin/env bash
# ==============================================================================
# AIDA - Startup Script
# ==============================================================================
# Single entry point for all modes:
#   ./start.sh                     Local-only — http://localhost:31337  (no TLS)
#   ./start.sh --lan               LAN-shared — https://<LAN_IP>        (Caddy + self-signed)
#   ./start.sh --domain X.Y[ Z]    Public     — https://X.Y             (Caddy + Let's Encrypt)
#   ./start.sh --dev               Dev mode   — http://localhost:5173   (Vite hot reload)
#
# Why TLS only in --lan / --domain:
#   - Local-only traffic never leaves the machine → TLS adds zero security
#     and a browser warning users have to click through. We skip it.
#   - --lan exposes traffic over WiFi → encryption mandatory.
#   - --domain serves over the internet → Let's Encrypt for a real cert.
# ==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*"; }
section() { echo -e "\n${BLUE}══════════════════════════════════════${NC}\n${BLUE}  $*${NC}\n${BLUE}══════════════════════════════════════${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ==============================================================================
# PARSE ARGUMENTS
# ==============================================================================

MODE="prod"          # prod | dev
TLS_MODE=""          # "" (none) | lan | domain
TLS_DOMAIN=""        # only when TLS_MODE=domain
TLS_EMAIL=""         # optional, only used in domain mode (Let's Encrypt)
SKIP_CHECKS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev|-d)     MODE="dev"; shift ;;
        --lan|-l)     TLS_MODE="lan"; shift ;;
        --domain)
            TLS_MODE="domain"
            TLS_DOMAIN="${2:-}"
            if [[ -z "$TLS_DOMAIN" || "$TLS_DOMAIN" == --* ]]; then
                echo "Error: --domain requires a value (e.g. --domain pentest.example.com)" >&2
                exit 1
            fi
            shift 2
            ;;
        --domain=*)   TLS_MODE="domain"; TLS_DOMAIN="${1#*=}"; shift ;;
        --email)
            TLS_EMAIL="${2:-}"
            if [[ -z "$TLS_EMAIL" || "$TLS_EMAIL" == --* ]]; then
                echo "Error: --email requires a value" >&2
                exit 1
            fi
            shift 2
            ;;
        --email=*)    TLS_EMAIL="${1#*=}"; shift ;;
        --fast|-f)    SKIP_CHECKS=true; shift ;;
        --help|-h)
            cat <<EOF
Usage: ./start.sh [OPTIONS]

Modes (mutually exclusive — pick one):
  (default)              Local-only — http://localhost:31337   (no TLS, simplest)
  --lan, -l              LAN-shared — https://<LAN_IP>         (Caddy + self-signed)
  --domain X.Y           Public     — https://X.Y              (Caddy + Let's Encrypt)
  --dev, -d              Dev mode   — http://localhost:5173    (Vite hot reload)
  --dev --lan            Dev + LAN  — Vite accessible from your network (HTTP only)

Options:
  --email EMAIL          Optional email for Let's Encrypt notifications (with --domain)
  --fast, -f             Skip dependency checks (faster startup)
  --help, -h             Show this help

Examples:
  ./start.sh
  ./start.sh --lan
  ./start.sh --domain aida.example.com --email admin@example.com
EOF
            exit 0
            ;;
        *)
            echo "Error: unknown argument: $1" >&2
            echo "Run ./start.sh --help for usage." >&2
            exit 1
            ;;
    esac
done

# --domain implies network exposure; reject combos that don't make sense
if [[ -n "$TLS_MODE" && "$MODE" == "dev" ]]; then
    # --lan + --dev is a legacy combo for Vite over LAN (no Caddy). Allow it.
    if [[ "$TLS_MODE" != "lan" ]]; then
        echo "Error: --domain is incompatible with --dev (TLS is for production only)" >&2
        exit 1
    fi
fi

# BIND drives FRONTEND_BIND_HOST / BACKEND_BIND_HOST in dev+LAN mode only.
# In prod TLS modes, the host bind is handled via CADDY_BIND set later.
BIND="127.0.0.1"
if [[ "$MODE" == "dev" && "$TLS_MODE" == "lan" ]]; then
    BIND="0.0.0.0"
fi

# ==============================================================================
# MODE-SPECIFIC CONFIG
# ==============================================================================

AIDA_PORT=31337

if [[ "$MODE" == "dev" ]]; then
    COMPOSE_FILES=""
    FRONTEND_URL="http://localhost:5173"
    if [[ "$BIND" == "0.0.0.0" ]]; then
        MODE_LABEL="Development+LAN"
    else
        MODE_LABEL="Development"
    fi
else
    # Prod mode — always loads prod.yml (Nginx on 31337). TLS overlay is
    # added below if --lan or --domain was passed.
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

    case "$TLS_MODE" in
        lan)
            COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.tls.yml"
            export CADDY_BIND="0.0.0.0"
            FRONTEND_URL=""           # filled in once we detect the LAN IP
            MODE_LABEL="LAN"
            ;;
        domain)
            COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.tls.yml"
            export CADDY_BIND="0.0.0.0"
            FRONTEND_URL="https://${TLS_DOMAIN}"
            MODE_LABEL="Domain ($TLS_DOMAIN)"
            ;;
        *)
            # Default local-only: Nginx exposed on 31337, no Caddy
            export FRONTEND_BIND="127.0.0.1"
            FRONTEND_URL="http://localhost:${AIDA_PORT}"
            MODE_LABEL="Local"
            ;;
    esac
fi

section "AIDA - ${MODE_LABEL} Mode"

# ==============================================================================
# QUICK CHECKS
# ==============================================================================

if ! command -v docker &> /dev/null; then
    error "Docker not installed. Get it from: https://docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    error "Docker daemon not running. Start Docker Desktop first."
    exit 1
fi

# Docker Compose: prefer plugin, fallback to standalone (Kali)
if docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
else
    error "Docker Compose not found. Install: sudo apt install docker-compose"
    exit 1
fi

# Build the full compose command for this mode
if [[ -n "$COMPOSE_FILES" ]]; then
    COMPOSE="$COMPOSE_CMD $COMPOSE_FILES"
else
    COMPOSE="$COMPOSE_CMD"
fi

# ==============================================================================
# TEAR DOWN OTHER MODE (if switching)
# ==============================================================================

# If a different mode is currently running, tear it down first. We detect via
# host port bindings:
#   port 5173  → dev (Vite)
#   port 31337 → prod local-only (Nginx exposed)
#   port 443   → prod TLS (Caddy in front of internal Nginx)

is_running_with_port() {
    local port=$1
    $COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tls.yml \
        ps --format "{{.Ports}}" 2>/dev/null | grep -q ":${port}"
}

teardown_other() {
    local files=$1
    local label=$2
    warn "$label currently running — tearing down to switch modes..."
    # shellcheck disable=SC2086
    $COMPOSE_CMD $files down --timeout 15
    log "$label stopped — data preserved"
    sleep 1
}

if [[ "$MODE" == "dev" ]]; then
    if is_running_with_port 31337; then
        teardown_other "-f docker-compose.yml -f docker-compose.prod.yml" "Local prod stack"
    elif is_running_with_port 443; then
        teardown_other "-f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tls.yml" "TLS prod stack"
    fi
else
    # Going to prod — stop dev if running
    if is_running_with_port 5173; then
        teardown_other "-f docker-compose.yml" "Dev stack"
    fi
    # Going to local prod — stop TLS prod if running, and vice versa
    if [[ -z "$TLS_MODE" ]] && is_running_with_port 443; then
        teardown_other "-f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tls.yml" "TLS prod stack"
    elif [[ -n "$TLS_MODE" ]] && is_running_with_port 31337 && ! is_running_with_port 443; then
        teardown_other "-f docker-compose.yml -f docker-compose.prod.yml" "Local prod stack"
    fi
fi

# ==============================================================================
# CHECK PORT CONFLICTS
# ==============================================================================

check_port() {
    local port=$1
    local service=$2
    # Docker runtimes (OrbStack, Docker Desktop) forward container ports through
    # their own process — they will always show up on our ports. Not a conflict.
    local docker_runtimes="OrbStack|com.docker|dockerd|Docker"

    if command -v lsof &>/dev/null; then
        local process
        process=$(lsof -iTCP:"$port" -sTCP:LISTEN -P -n 2>/dev/null | awk 'NR==2 {print $1}')
        if [[ -n "$process" ]] && ! echo "$process" | grep -qE "$docker_runtimes"; then
            warn "Port $port ($service) is already in use by: $process"
            return 1
        fi
    elif command -v ss &>/dev/null; then
        local process
        process=$(ss -tlnp 2>/dev/null | grep ":$port " | sed 's/.*users:(("\([^"]*\)".*/\1/')
        if [[ -n "$process" ]] && ! echo "$process" | grep -qE "$docker_runtimes"; then
            warn "Port $port ($service) is already in use by: $process"
            return 1
        fi
    fi
    return 0
}

PORT_CONFLICT=false
check_port 5432 "PostgreSQL" || PORT_CONFLICT=true
check_port 8000 "Backend"    || PORT_CONFLICT=true

if [[ "$MODE" == "dev" ]]; then
    check_port 5173 "Frontend (Vite)" || PORT_CONFLICT=true
elif [[ -n "$TLS_MODE" ]]; then
    check_port 443 "Caddy HTTPS" || PORT_CONFLICT=true
    check_port 80  "Caddy HTTP"  || PORT_CONFLICT=true
else
    check_port 31337 "Frontend (Nginx)" || PORT_CONFLICT=true
fi

if [[ "$PORT_CONFLICT" == "true" ]]; then
    echo ""
    warn "Port conflict detected!"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Aborted due to port conflict"
        exit 1
    fi
fi

# ==============================================================================
# CONTAINER MODE (aida-pentest or exegol)
# ==============================================================================

CONTAINER_PREFS_FILE="$SCRIPT_DIR/.aida/container-preference"
mkdir -p "$SCRIPT_DIR/.aida"
CONTAINER_MODE=$(cat "$CONTAINER_PREFS_FILE" 2>/dev/null || echo "aida-pentest")

# Default to aida-pentest on first run (no interactive prompt)
if [[ ! -f "$CONTAINER_PREFS_FILE" ]]; then
    echo "aida-pentest" > "$CONTAINER_PREFS_FILE"
fi

# ==============================================================================
# CADDYFILE GENERATION (early — needs to exist before docker compose up)
# Generated only for --lan / --domain. Idempotent: writing the same content
# is a no-op. We compare hashes after to detect mode-switch (--lan ↔ --domain).
# ==============================================================================

CADDYFILE_HASH_BEFORE=""
CADDYFILE_HASH_AFTER=""

if [[ -n "$TLS_MODE" ]]; then
    mkdir -p "$SCRIPT_DIR/.aida"
    [[ -f "$SCRIPT_DIR/.aida/Caddyfile" ]] && CADDYFILE_HASH_BEFORE=$(shasum "$SCRIPT_DIR/.aida/Caddyfile" 2>/dev/null | awk '{print $1}')

    if [[ "$TLS_MODE" == "domain" ]]; then
        {
            echo "{"
            echo "    admin off"
            [[ -n "$TLS_EMAIL" ]] && echo "    email $TLS_EMAIL"
            echo "}"
            echo ""
            echo "$TLS_DOMAIN {"
            echo "    reverse_proxy frontend:80 {"
            echo "        header_up Host              {upstream_hostport}"
            echo "        header_up X-Real-IP         {remote_host}"
            echo "        header_up X-Forwarded-For   {remote_host}"
            echo "        header_up X-Forwarded-Proto {scheme}"
            echo "    }"
            echo "}"
        } > "$SCRIPT_DIR/.aida/Caddyfile"
    else
        cat > "$SCRIPT_DIR/.aida/Caddyfile" <<'EOF'
{
    admin off
    auto_https off
}

:80 {
    redir https://{host}{uri} 301
}

:443 {
    tls {
        on_demand
        issuer internal
    }

    reverse_proxy frontend:80 {
        header_up Host              {upstream_hostport}
        header_up X-Real-IP         {remote_host}
        header_up X-Forwarded-For   {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
EOF
    fi

    CADDYFILE_HASH_AFTER=$(shasum "$SCRIPT_DIR/.aida/Caddyfile" 2>/dev/null | awk '{print $1}')
fi

# ==============================================================================
# CHECK IF ALREADY RUNNING (same mode)
# ==============================================================================

# Check the AIDA core containers by name (not just count — the user might
# have unrelated containers up on the same host).
running_names=$(docker ps --format "{{.Names}}" 2>/dev/null)
core_up=true
for name in aida_postgres aida_backend aida_frontend; do
    echo "$running_names" | grep -q "^${name}$" || { core_up=false; break; }
done
# In TLS mode, Caddy must also be up
if [[ -n "$TLS_MODE" ]] && ! echo "$running_names" | grep -q "^aida_caddy$"; then
    core_up=false
fi

if [[ "$core_up" == "true" ]]; then
    # If TLS mode and the Caddyfile changed (e.g. --lan → --domain), reload Caddy.
    if [[ -n "$TLS_MODE" && "$CADDYFILE_HASH_BEFORE" != "$CADDYFILE_HASH_AFTER" ]]; then
        log "Caddyfile changed — reloading Caddy..."
        $COMPOSE restart caddy >/dev/null 2>&1 || true
    fi

    log "AIDA is already running! (${MODE_LABEL})"
    echo ""
    $COMPOSE ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null \
        | grep -E "NAME|aida_(postgres|backend|frontend|caddy|docker_proxy)|aida-pentest" || true
    echo ""
    log "Frontend: $FRONTEND_URL"
    log "Backend:  http://localhost:8000"
    echo ""
    exit 0
fi

# ==============================================================================
# ENVIRONMENT FILES (Quick)
# ==============================================================================

if [[ ! -f backend/.env ]]; then
    if [[ -f backend/.env.docker ]]; then
        cp backend/.env.docker backend/.env
        log "Created backend/.env"
    elif [[ -f backend/.env.example ]]; then
        cp backend/.env.example backend/.env
        log "Created backend/.env from example"
    fi
fi

if [[ "$MODE" == "dev" ]] && [[ "$BIND" != "0.0.0.0" ]]; then
    # Always (re)write so a previous --lan run doesn't leave a stale LAN IP
    echo "VITE_API_URL=http://localhost:8000/api" > frontend/.env
    log "Created/updated frontend/.env"
fi

# ==============================================================================
# PYTHON ENVIRONMENTS (Only if missing — needed for MCP server on host)
# ==============================================================================

if [[ "$SKIP_CHECKS" == "false" ]]; then
    # Find Python 3.10+
    PYTHON_CMD="python3"
    for py in python3.13 python3.12 python3.11 python3.10; do
        if command -v $py &> /dev/null; then
            PYTHON_CMD=$py
            break
        fi
    done

    # CLI venv
    if [[ ! -f ".venv/bin/python" ]]; then
        log "Creating CLI virtual environment..."
        $PYTHON_CMD -m venv .venv
        .venv/bin/pip install -q --upgrade pip
        [[ -f requirements.txt ]] && .venv/bin/pip install -q -r requirements.txt
        log "CLI environment ready"
    fi

    # Backend venv (for MCP server)
    if [[ ! -f "backend/venv/bin/python" ]]; then
        log "Creating backend virtual environment..."
        $PYTHON_CMD -m venv backend/venv
        backend/venv/bin/pip install -q --upgrade pip
        [[ -f backend/requirements.txt ]] && backend/venv/bin/pip install -q -r backend/requirements.txt
        log "Backend environment ready"
    fi
fi

# ==============================================================================
# LAN MODE — detect IP and set CORS
# ==============================================================================

detect_lan_ip() {
    local ip=""
    # macOS first (ipconfig is more reliable than hostname)
    if command -v ipconfig &>/dev/null; then
        for iface in en0 en1 en2 en3; do
            ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
            [[ -n "$ip" ]] && { echo "$ip"; return; }
        done
    fi
    # Linux
    if command -v hostname &>/dev/null; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
        [[ -n "$ip" ]] && { echo "$ip"; return; }
    fi
}

HOST_IP=""

if [[ "$MODE" == "dev" && "$TLS_MODE" == "lan" ]]; then
    # Dev + LAN — Vite over HTTP on the network (no Caddy)
    HOST_IP=$(detect_lan_ip)
    if [[ -z "$HOST_IP" ]]; then
        warn "Could not auto-detect LAN IP."
        read -rp "Enter your machine's LAN IP (e.g. 192.168.1.10): " HOST_IP
    fi
    log "LAN IP: $HOST_IP"
    export BACKEND_BIND_HOST="0.0.0.0"
    export FRONTEND_BIND_HOST="0.0.0.0"
    echo "VITE_API_URL=http://${HOST_IP}:8000/api" > frontend/.env
    export BACKEND_CORS_ORIGINS="http://${HOST_IP}:5173,http://localhost:5173,http://127.0.0.1:5173"
    FRONTEND_URL="http://${HOST_IP}:5173"

elif [[ "$TLS_MODE" == "lan" ]]; then
    # Prod LAN — Caddy on 443 with self-signed
    HOST_IP=$(detect_lan_ip)
    if [[ -z "$HOST_IP" ]]; then
        warn "Could not auto-detect LAN IP."
        read -rp "Enter your machine's LAN IP (e.g. 192.168.1.10): " HOST_IP
    fi
    log "LAN IP: $HOST_IP"
    export BACKEND_CORS_ORIGINS="https://${HOST_IP},https://localhost,https://127.0.0.1"
    FRONTEND_URL="https://${HOST_IP}"

elif [[ "$TLS_MODE" == "domain" ]]; then
    # Prod domain — Caddy on 443 with Let's Encrypt
    export BACKEND_CORS_ORIGINS="https://${TLS_DOMAIN}"
    FRONTEND_URL="https://${TLS_DOMAIN}"
fi

# ==============================================================================
# DOCKER — Smart Build
# ==============================================================================

section "Docker Containers"

# Check for orphan containers from other projects with same names
ORPHAN_POSTGRES=$(docker ps -a --format "{{.Names}}" | grep "^aida_postgres$" || true)
ORPHAN_BACKEND=$(docker ps -a --format "{{.Names}}" | grep "^aida_backend$" || true)
ORPHAN_FRONTEND=$(docker ps -a --format "{{.Names}}" | grep "^aida_frontend$" || true)

OUR_CONTAINERS=$($COMPOSE ps -a -q 2>/dev/null | wc -l | tr -d ' ')

if [[ -n "$ORPHAN_POSTGRES" || -n "$ORPHAN_BACKEND" || -n "$ORPHAN_FRONTEND" ]] && [[ "$OUR_CONTAINERS" -eq 0 ]]; then
    warn "Found containers from another project with same names"
    log "Removing orphan containers..."
    docker rm -f aida_postgres aida_backend aida_frontend 2>/dev/null || true
    log "Orphan containers removed"
fi

# Dev mode: always build from source (hot reload needs local code)
# Prod mode: pull backend from Hub (instant start); always build the frontend
#            locally because Dockerfile.prod bakes VITE_API_URL=/api at
#            compile time — the Hub image (built from the base Dockerfile)
#            runs the Vite dev server, not Nginx.
if [[ "$MODE" == "dev" ]]; then
    log "Building Docker images from source..."
    if [[ "$CONTAINER_MODE" == "aida-pentest" ]]; then
        $COMPOSE build --quiet
    else
        $COMPOSE build --quiet backend frontend
    fi
else
    log "Pulling backend image..."
    if $COMPOSE pull --quiet backend 2>/dev/null; then
        log "Backend image pulled from Docker Hub"
    else
        warn "Backend pull failed — building from source..."
        $COMPOSE build --quiet backend
    fi
    # Frontend must always be built locally: Dockerfile.prod bakes VITE_API_URL=/api
    log "Building frontend (Nginx) from source..."
    $COMPOSE build --quiet frontend
fi

# ==============================================================================
# START CONTAINERS
# ==============================================================================

# Check core containers again (after teardown). 'docker compose up -d' is
# idempotent, so this is mostly to skip a redundant log line.
running_names=$(docker ps --format "{{.Names}}" 2>/dev/null)
core_up=true
for name in aida_postgres aida_backend aida_frontend; do
    echo "$running_names" | grep -q "^${name}$" || { core_up=false; break; }
done

if [[ "$core_up" == "true" ]]; then
    log "Containers already running"
else
    log "Starting containers..."
    if [[ "$MODE" == "dev" ]]; then
        # Dev mode — set ENVIRONMENT so backend uses --reload
        ENVIRONMENT=development $COMPOSE up -d --remove-orphans 2>&1 | grep -v "already exists but was created for project" || true
    else
        if [[ "$CONTAINER_MODE" == "aida-pentest" ]]; then
            # Bring up everything in the merged compose (postgres, backend, frontend,
            # docker-proxy, aida-pentest, and caddy if TLS overlay is loaded).
            $COMPOSE up -d --remove-orphans 2>&1 | grep -v "already exists but was created for project" || true
        else
            # Exegol mode — explicit service list (skip aida-pentest, the user runs Exegol externally).
            # Append "caddy" when the TLS overlay is loaded so it's not omitted.
            local_services=(postgres backend frontend)
            [[ -n "$TLS_MODE" ]] && local_services+=(caddy)
            $COMPOSE up -d --remove-orphans "${local_services[@]}" 2>&1 | grep -v "already exists but was created for project" || true
        fi
    fi
fi

# ==============================================================================
# WAIT FOR SERVICES
# ==============================================================================

section "Waiting for Services"

wait_for_service() {
    local name=$1
    local check_cmd=$2
    local max_wait=${3:-30}
    local i=0

    printf "  %-12s " "$name..."
    while ! eval "$check_cmd" &>/dev/null; do
        ((i++))
        if [[ $i -ge $max_wait ]]; then
            echo -e "${RED}TIMEOUT${NC}"
            return 1
        fi
        sleep 1
    done
    echo -e "${GREEN}Ready${NC}"
}

wait_for_service "PostgreSQL" "$COMPOSE exec -T postgres pg_isready -U aida" 30 || { error "PostgreSQL did not become ready. Check: $COMPOSE logs postgres"; exit 1; }
wait_for_service "Backend"    "curl -sf http://localhost:8000/health"         60 || { error "Backend did not become ready. Check: $COMPOSE logs backend"; exit 1; }

if [[ "$MODE" == "dev" ]]; then
    wait_for_service "Frontend" "curl -sf http://localhost:5173" 120 || { error "Frontend (Vite) did not start. Check: $COMPOSE logs frontend"; exit 1; }
elif [[ "$TLS_MODE" == "domain" ]]; then
    # Let's Encrypt issuance can take 30-60s on first request
    wait_for_service "Caddy" "curl -sfk https://localhost" 180 || { error "Caddy (TLS) did not start. Check: $COMPOSE logs caddy"; exit 1; }
elif [[ "$TLS_MODE" == "lan" ]]; then
    wait_for_service "Caddy" "curl -sfk https://localhost" 90 || { error "Caddy (LAN) did not start. Check: $COMPOSE logs caddy"; exit 1; }
else
    wait_for_service "Frontend" "curl -sf http://localhost:${AIDA_PORT}" 90 || { error "Frontend (Nginx) did not start. Check: $COMPOSE logs frontend"; exit 1; }
fi

# ==============================================================================
# HOST HELPER (Background)
# ==============================================================================

pkill -f "tools/helper.py" 2>/dev/null || true
pkill -f "folder_opener.py" 2>/dev/null || true
if [[ -f "$SCRIPT_DIR/tools/helper.py" ]]; then
    python3 "$SCRIPT_DIR/tools/helper.py" &>/dev/null &
fi

# ==============================================================================
# PENTEST CONTAINER STATUS
# ==============================================================================

if [[ "$CONTAINER_MODE" == "exegol" ]]; then
    EXEGOL_RUNNING=$(docker ps --format "{{.Names}}" 2>/dev/null | grep -i "^exegol-" || true)
    if [[ -n "$EXEGOL_RUNNING" ]]; then
        log "Exegol container: $EXEGOL_RUNNING"
    fi
else
    PENTEST_RUNNING=$(docker ps --format "{{.Names}}" 2>/dev/null | grep "^aida-pentest$" || true)
    if [[ -z "$PENTEST_RUNNING" ]]; then
        warn "aida-pentest not running — starting..."
        $COMPOSE up -d aida-pentest 2>&1 | grep -v "already" || true
    else
        log "Pentesting container: aida-pentest"
    fi
fi

# ==============================================================================
# SUCCESS
# ==============================================================================

section "AIDA Ready (${MODE_LABEL})"

echo ""
log "Frontend : $FRONTEND_URL"
log "Backend  : http://localhost:8000"
log "API Docs : http://localhost:8000/docs"

case "$TLS_MODE" in
    lan)
        log "TLS      : self-signed (browser warning expected)"
        echo ""
        echo -e "  ${BLUE}Share with your team →${NC}  $FRONTEND_URL"
        ;;
    domain)
        log "TLS      : Let's Encrypt"
        ;;
esac

echo ""
$COMPOSE ps --format "table {{.Name}}\t{{.Status}}"
echo ""
