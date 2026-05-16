#!/usr/bin/env bash
set -euo pipefail

log() {
    echo "[INFO] $*" >&2
}

err() {
    echo "[ERROR] $*" >&2
}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
LOG_FILE="/tmp/aida_mcp.log"

log "Starting AIDA"
log "Script path: $SCRIPT_DIR"
log "Backend path: $BACKEND_DIR"

if [[ ! -d "$BACKEND_DIR" ]]; then
    err "Backend directory not found: $BACKEND_DIR"
    exit 1
fi

cd "$BACKEND_DIR"

if [[ ! -d "$VENV_DIR" ]]; then
    log "Creating missing venv..."
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

log "Ensuring pip is up to date..."
"$VENV_DIR/bin/python3" -m pip install --quiet --upgrade pip setuptools wheel || true

log "Installing dependencies from requirements.txt..."
"$VENV_DIR/bin/python3" -m pip install --quiet -r requirements.txt || true

log "Testing MCP import..."
"$VENV_DIR/bin/python3" - << 'EOF'
try:
    from mcp.server import Server
    import sys
    print("✅ MCP import OK", file=sys.stderr)
except Exception as e:
    import sys
    print(f"❌ MCP import FAILED: {e}", file=sys.stderr)
    sys.exit(1)
EOF

log "Launching MCP server"
log "Logs will be in $LOG_FILE"

exec "$VENV_DIR/bin/python3" -u mcp/aida_mcp_server.py 2>"$LOG_FILE"
