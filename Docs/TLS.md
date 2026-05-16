# TLS / HTTPS

Nemesis picks a TLS strategy from the flag you pass to `./start.sh`. There is no
wizard, no config file, no setup step — the flag dictates everything.

| Mode | Command | URL | TLS |
|------|---------|-----|-----|
| **Local** | `./start.sh` | `http://localhost:31337` | none |
| **LAN** | `./start.sh --lan` | `https://<LAN_IP>` | Caddy local CA (self-signed) |
| **Domain** | `./start.sh --domain example.com` | `https://example.com` | Caddy + Let's Encrypt |
| **Dev** | `./start.sh --dev` | `http://localhost:5173` | none (Vite) |

---

## LAN mode (`--lan`)

```bash
./start.sh --lan
# → https://192.168.1.42
```

Caddy listens on `0.0.0.0:443`/`80` and serves a certificate generated on
demand by Caddy's local CA. The first time you (or a teammate) hit the URL,
the browser shows a security warning — accept it once and the cert sticks.

CORS is set to `https://<LAN_IP>,https://localhost,https://127.0.0.1` so the
frontend works whether you load it via the LAN IP or via localhost on the
host machine.

---

## Domain mode (`--domain X.Y`)

```bash
./start.sh --domain nemesis.example.com
# Optional: --email admin@example.com  (Let's Encrypt expiry notifications)
```

Caddy listens on `0.0.0.0:443`/`80` and obtains a real Let's Encrypt
certificate via the HTTP-01 challenge.

**Two requirements** — both have to be true or ACME fails:

1. The domain's DNS A/AAAA record must point to this machine's public IP.
2. Inbound port 80 must be reachable from the internet (firewall/NAT).

First issuance takes 30 to 60 seconds; `start.sh` waits up to 3 minutes
before timing out the readiness check.

If you want to receive expiry warnings from Let's Encrypt, pass `--email`.
It's optional but recommended.

---

## Generated files

When `--lan` or `--domain` is used, `start.sh` writes a Caddyfile to
`.nemesis/Caddyfile` (gitignored). This file is regenerated on every run from
the flags you pass — don't edit it directly.

`.nemesis/Caddyfile` is consumed by Caddy via the `docker-compose.tls.yml`
overlay, which is loaded only when one of the TLS flags is set.

---

## Switching modes

You can switch freely. `start.sh` detects the currently running mode from
the host port mapping and tears it down before bringing up the new stack:

```bash
./start.sh                   # local
./start.sh --lan             # switches to LAN, tears down local
./start.sh                   # switches back to local, tears down LAN
```

Postgres data is in the `nemesis_postgres_data` Docker volume and is **never**
removed — only containers are stopped.

---

## Troubleshooting

### Browser warning in LAN mode

Expected. It's a self-signed cert from Caddy's local CA. Click
"Advanced → Proceed". The browser caches the exception per origin.

### Let's Encrypt fails to issue

Check the Caddy logs:
```bash
docker logs nemesis_caddy
```

Most common causes:
- Port 80 not reachable from the internet (firewall, NAT).
- Domain doesn't actually resolve to this machine: `dig +short your-domain.com`.
- Hit the rate limit (5 failures/hour/host). Wait an hour and retry.

### Caddy is unhealthy at startup

The healthcheck pings `http://127.0.0.1:80` inside the container, which serves
a 301 redirect to HTTPS. A 301 counts as healthy. Allow 15 to 30 seconds for
Caddy to initialize its internal CA on first start.

### MCP HTTP transport over HTTPS

Once TLS is up, the MCP endpoint is reachable at
`https://<your-host>/mcp` through Caddy. The direct `http://localhost:8000/mcp`
also still works for local CLI use — see [`MCP_TOOLS.md`](MCP_TOOLS.md).
