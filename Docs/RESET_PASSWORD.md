# Reset a Forgotten Password

Nemesis does **not** ship with an email-based password reset flow. Since the
platform is designed to run locally and the operator already has shell
access to the host, password resets are handled through a single
`docker compose exec` command. This is the same pattern used by GitLab
(`gitlab-rake`), Grafana (`grafana-cli`) and Jenkins (XML edit) — it is
deliberate, not a missing feature.

> **Who should use this page?** Only the admin who has lost their own
> password and has no other admin to help. For every other case, an
> existing admin can reset any user's password from the **Users** page in
> the web UI.

---

## Reset the admin password

Run from the project root, where `docker-compose.yml` lives:

```bash
docker compose exec backend python -c "
from auth import hash_password
from database import SessionLocal
from models.user import User
db = SessionLocal()
u = db.query(User).filter(User.username == 'admin').first()
u.hashed_password = hash_password('TempPass123')
u.must_change_password = True
db.commit()
print('OK — admin password reset, must change on next login')
"
```

Replace `'TempPass123'` with the temporary password you want to use
(7 characters minimum). The user will be **forced to change it** the
next time they log in via the web UI.

---

## Reset another user's password

Replace `'admin'` with the target username:

```bash
docker compose exec backend python -c "
from auth import hash_password
from database import SessionLocal
from models.user import User
db = SessionLocal()
u = db.query(User).filter(User.username == 'alice').first()
u.hashed_password = hash_password('TempPass123')
u.must_change_password = True
db.commit()
print('OK — password reset')
"
```

If the user does not exist, `u` will be `None` and the script will raise
`AttributeError: 'NoneType' object has no attribute 'hashed_password'`.
That's the signal you typed the wrong username.

---

## List all users

Useful when you can't remember the exact username spelling:

```bash
docker compose exec postgres psql -U nemesis -d nemesis_assessments \
    -c "SELECT id, username, role, is_active, must_change_password FROM users;"
```

---

## Promote a user to admin

If your only admin is locked out and you don't want to use it, you can
promote any other existing user to admin and use that account instead:

```bash
docker compose exec postgres psql -U nemesis -d nemesis_assessments \
    -c "UPDATE users SET role='admin' WHERE username='alice';"
```

---

## Re-activate a disabled account

```bash
docker compose exec postgres psql -U nemesis -d nemesis_assessments \
    -c "UPDATE users SET is_active=true WHERE username='alice';"
```

---

## Why not a reset link by email?

- Nemesis has no SMTP configuration and is designed to run on a single host.
- The `email` field on a user account is **optional** — most users won't
  have one.
- Implementing a token table, expiration, rate limiting and secure
  delivery would be significantly more code than this one-liner, with no
  tangible benefit on a self-hosted local tool.
- Anyone who can `docker compose exec` already has root on the host. If
  they can run docker, they can already read the database. Resetting a
  password adds no new attack surface.

If you ever expose Nemesis behind a real domain (which is **not**
recommended), you should put it behind your own SSO / reverse-proxy
authentication rather than building an email reset flow on top.
