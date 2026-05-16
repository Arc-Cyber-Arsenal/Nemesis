"""
Ensure that SECRET_KEY exists and is non-default in backend/.env BEFORE the
rest of the FastAPI application loads.

This module must be imported FIRST in main.py — before `config` and before
any module that reads `os.getenv("SECRET_KEY")` (notably `auth`).

Behavior:
  - If SECRET_KEY is already set in the environment to a real value, do nothing.
  - Otherwise, generate a fresh 48-byte URL-safe random key, persist it to
    backend/.env so it survives restarts, and inject it into os.environ so
    the current process picks it up immediately.

Same pattern as Django's `manage.py runserver` warning, GitLab's secrets
provisioning and Grafana's auto-generated admin password — zero-config for
the user, zero risk of running with a publicly known key.
"""
import os
import secrets
from pathlib import Path

# The published default that lived in auth.py until the bootstrap was added.
# Treated as "not set" so we replace it on first launch even on existing
# installs that have it persisted by accident.
LEGACY_DEFAULT = "nemesis-secret-key-change-in-production-min-32-chars!"

ENV_PATH = Path(__file__).resolve().parent / ".env"


def _read_lines() -> list[str]:
    if not ENV_PATH.exists():
        return []
    return ENV_PATH.read_text().splitlines()


def _extract_existing(lines: list[str]) -> str | None:
    for line in lines:
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, _, value = s.partition("=")
        if key.strip() == "SECRET_KEY":
            value = value.strip().strip("'").strip('"')
            if value and value != LEGACY_DEFAULT:
                return value
    return None


def _write_secret(lines: list[str], secret: str) -> None:
    out: list[str] = []
    replaced = False
    for line in lines:
        if line.lstrip().startswith("SECRET_KEY="):
            out.append(f"SECRET_KEY={secret}")
            replaced = True
        else:
            out.append(line)
    if not replaced:
        if out and out[-1].strip() != "":
            out.append("")
        out.append("# Auto-generated on first launch — keep secret, do not commit")
        out.append(f"SECRET_KEY={secret}")

    ENV_PATH.write_text("\n".join(out) + "\n")


def ensure_secret_key() -> None:
    """Idempotent: guarantees os.environ['SECRET_KEY'] is set to a real value."""
    env_value = os.getenv("SECRET_KEY", "")
    if env_value and env_value != LEGACY_DEFAULT:
        return  # already provided by env_file or shell

    lines = _read_lines()
    existing = _extract_existing(lines)
    if existing:
        os.environ["SECRET_KEY"] = existing
        return

    secret = secrets.token_urlsafe(48)
    try:
        _write_secret(lines, secret)
        persisted = True
    except OSError as exc:
        # File may be read-only inside the container; the in-memory env var
        # is still good for the lifetime of the process.
        persisted = False
        print(f"[bootstrap] WARNING: could not persist SECRET_KEY to .env: {exc}")

    os.environ["SECRET_KEY"] = secret
    where = "backend/.env" if persisted else "in-memory only"
    print(f"[bootstrap] Generated new SECRET_KEY ({where})")
