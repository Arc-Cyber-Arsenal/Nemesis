#!/usr/bin/env bash
# ==============================================================================
# AIDA - Restart Services
# ==============================================================================
# Restarts all containers and waits for them to be healthy.
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

# Docker Compose: prefer plugin, fallback to standalone (Kali)
if docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

section "AIDA - Restarting Services"

# Detect active mode. Stopped containers don't expose .Ports, so we use
# container names + inspect for port bindings instead.
#   aida_caddy exists  → TLS prod
#   aida_frontend has 31337 binding → local prod
#   otherwise → dev
ALL_NAMES=$(docker ps -a --format "{{.Names}}" 2>/dev/null || true)

if echo "$ALL_NAMES" | grep -q "^aida_caddy$"; then
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tls.yml"
    MODE_LABEL="TLS prod"
elif echo "$ALL_NAMES" | grep -q "^aida_frontend$" \
     && docker inspect aida_frontend --format '{{json .HostConfig.PortBindings}}' 2>/dev/null | grep -q "31337"; then
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
    MODE_LABEL="Local prod"
else
    COMPOSE_FILES=""
    MODE_LABEL="Dev"
fi
COMPOSE="$COMPOSE_CMD $COMPOSE_FILES"

# Check if containers exist at all
RUNNING=$($COMPOSE ps --status running -q 2>/dev/null | wc -l | tr -d ' ')
STOPPED=$($COMPOSE ps --status exited -q 2>/dev/null | wc -l | tr -d ' ')
TOTAL=$((RUNNING + STOPPED))

if [[ "$TOTAL" -eq 0 ]]; then
    warn "No AIDA containers found"
    echo ""
    echo "Use ./start.sh to start AIDA for the first time"
    exit 1
fi

# Restart host helper
pkill -f "tools/helper.py" 2>/dev/null || true
pkill -f "folder_opener.py" 2>/dev/null || true  # legacy name
if [[ -f "$SCRIPT_DIR/tools/helper.py" ]]; then
    python3 "$SCRIPT_DIR/tools/helper.py" &>/dev/null &
    log "Restarted Host Helper"
fi

# Restart containers
log "Restarting containers (${MODE_LABEL})..."
$COMPOSE restart

# Wait for services
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

wait_for_service "PostgreSQL" "$COMPOSE exec -T postgres pg_isready -U aida" 30
wait_for_service "Backend"    "curl -sf http://localhost:8000/health"          60

# Frontend check: depends on the mode detected above
case "$MODE_LABEL" in
    "TLS prod")
        FRONTEND_URL="https://localhost"
        wait_for_service "Caddy" "curl -sfk https://localhost" 60
        ;;
    "Local prod")
        FRONTEND_URL="http://localhost:31337"
        wait_for_service "Frontend" "curl -sf http://localhost:31337" 60
        ;;
    *)
        FRONTEND_URL="http://localhost:5173"
        wait_for_service "Frontend" "curl -sf http://localhost:5173" 120
        ;;
esac

# Success
section "AIDA Restarted"

echo ""
$COMPOSE ps --format "table {{.Name}}\t{{.Status}}"
echo ""
log "Frontend : $FRONTEND_URL"
log "Backend  : http://localhost:8000"
echo ""
