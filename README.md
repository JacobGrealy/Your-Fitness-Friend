# FitnessFriend

A personal fitness and nutrition tracker: a Flask API plus a React/TypeScript
single-page app. It tracks weight and exercise, logs food (search, quick add,
barcode and photo workflows), derives BMR/TDEE and calorie/macro goals from your
profile, and can call a local LLM endpoint to estimate meals and exercise.

## Stack

- **Backend** — Flask 3.1, SQLAlchemy + Flask-Migrate (SQLite), Flask-Login,
  Python 3.13
- **Frontend** — React 18, TypeScript, Vite, Zustand, react-hook-form + Zod,
  Tailwind CSS + daisyUI
- **Deploy** — gunicorn under systemd; the API and the built SPA are served from
  a single port

## Quickstart

```bash
# backend dependencies (project venv — do not install system-wide)
./venv/bin/pip install -r requirements.txt

# frontend dependencies
cd frontend && npm install && cd ..

# apply database migrations
FLASK_APP=main.py ./venv/bin/flask db upgrade
```

Run the two dev servers:

```bash
./venv/bin/python main.py --port 5001   # Flask API
cd frontend && npm run dev              # Vite dev server on :5173
```

## URLs

| What | Where |
| --- | --- |
| Production (API + built SPA) | `http://<host>:5001` |
| Dev server (hot reload, proxies `/api` → `:5001`) | `http://<host>:5173` |

The host address is DHCP-assigned and changes; check it rather than assuming.

## Tests

```bash
./venv/bin/python -m pytest tests/      # 40 passed, 21 skipped
cd frontend && npm test                 # 92 tests, all passing
cd frontend && npx tsc --noEmit         # type check
```

The backend's skipped tests are expected — some are blocked on a SQLAlchemy
version-detection quirk, others are marked "Requires session handling fix".

## Production

```bash
sudo ./deploy-production.sh              # build frontend + install/restart service
sudo systemctl restart fitnessfriend     # after backend code changes
```

| Unit | Role |
| --- | --- |
| `fitnessfriend.service` | gunicorn on `0.0.0.0:5001` — API and built SPA |
| `fitness-frontend.service` | Vite dev server on `0.0.0.0:5173`, proxies to `:5001` |

`install-dev-services.sh` installs only the dev frontend. A `fitness-backend.service`
may still exist on an older host: it was a duplicate dev backend on port 5001 that
crash-looped, so leave it disabled or remove it.

## Data and migrations

- SQLite database: `instance/fitness_friend.db`
- Uploads: `app/uploads/`
- Migrations use Flask-Migrate (the bare Alembic CLI is not configured):

```bash
FLASK_APP=main.py ./venv/bin/flask db heads
FLASK_APP=main.py ./venv/bin/flask db upgrade
FLASK_APP=main.py ./venv/bin/flask db revision -m "describe change"
```

Commit every migration file — the database's `alembic_version` and the files in
git have to agree or a fresh `upgrade head` fails.

## Backups

`scripts/backup.sh` snapshots everything that cannot be rebuilt from the repo:
the database, `app/uploads/`, `.env` (which holds `SECRET_KEY`, so a restore is
otherwise incomplete) and the **AweFit release keystore** (lose it and no APK can
ever be installed over the one on the phone again). It runs daily at 03:15 from
the user crontab and keeps the last 14 snapshots.

```bash
./scripts/backup.sh          # run one now
crontab -l                   # confirm the schedule
tail -20 logs/backup.log     # cron output
```

Layout under `backups/` (gitignored):

```
db/fitness_friend-<stamp>.db.gz   gzipped, integrity-checked snapshots
uploads/<stamp>/                  hardlinked rsync snapshots of the photos
uploads/latest -> <stamp>         points at the newest
env/.env                          copy of .env, mode 600
keys/                             AweFit signing keystore + properties, mode 700
```

The database is copied with SQLite's online backup API rather than `cp`, so a
write in flight cannot produce a torn file, and each snapshot is checked with
`PRAGMA integrity_check` before it is kept. Uploads use `rsync --link-dest`, so a
92 MB photo tree costs only the changed files per run.

**Restore the database:**

```bash
sudo systemctl stop fitnessfriend
gunzip -c backups/db/fitness_friend-<stamp>.db.gz > instance/fitness_friend.db
sudo systemctl start fitnessfriend
```

**Restore uploads:**

```bash
rsync -a --delete backups/uploads/latest/ app/uploads/
```

**Restore the signing key** (only needed if `~/.android-keys/` is lost):

```bash
mkdir -p ~/.android-keys && chmod 700 ~/.android-keys
install -m 600 backups/keys/awefit-release.jks ~/.android-keys/
install -m 600 backups/keys/keystore.properties frontend/android/keystore.properties
```

These copies live on the same disk, so they cover mistakes, not disk failure.
Mirror `backups/` to another machine periodically for real protection.

## Configuration

`run-backend.sh` sources `.env` (gitignored), which supplies:

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | Flask session signing key |
| `DATABASE_URL` | Override the default SQLite path |
| `CORS_ORIGINS` | Comma-separated allowlist for cross-origin API calls |
| `FLASK_ENV` / `FLASK_CONFIG` | Selects the config class; must be `production` on a real deployment or `DEBUG` leaks tracebacks |
| `QWEN_BASE_URL` | llama-swap endpoint backing all AI features |
| `QWEN_MODEL` | Model id to request; must be one the server actually serves |

## Documentation

- `AGENTS.md` — development guidelines for coding agents (env, tests, deploy,
  deploy traps)
- `docs/api.md` — API reference
- `docs/superpowers/` — feature specs and implementation plans

## Features

- Diary by meal with per-entry photo thumbnails; tap a row to edit it
- Editing a food log updates the entry and its linked saved food, while other
  logs that reference the same food keep their own nutrition snapshot
- Per-entry photos with upload/replace/delete, plus quick add, barcode and
  photo-based logging
- Weight and exercise tracking, BMR/TDEE and macro goals, weekly goal
- AI assistance (exercise calorie estimation, meal photo analysis) through a
  local llama-swap endpoint

The Edit Food Log design notes live in
`docs/superpowers/specs/2026-06-10-edit-food-log-design.html`.
