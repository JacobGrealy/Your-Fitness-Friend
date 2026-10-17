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
./venv/bin/python -m pytest tests/      # 103 passed, nothing skipped
cd frontend && npm test                 # 108 tests, all passing
cd frontend && npx tsc --noEmit         # type check
```

Every test runs — there are no skipped placeholders left.

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

## AweFit (Android)

AweFit is the Android client: a thin Capacitor shell that loads the running
server in a WebView (same origin, so the session cookie, uploads and photo URLs
all behave as in a browser). It therefore needs the server reachable — LAN or
Tailscale — and has no offline mode.

```bash
./scripts/android-toolchain.sh          # once: JDK 21 + Android SDK 36 under ~/tools
./scripts/build-android.sh --bump       # web build + signed release APK + publish
./scripts/android-version.py show       # versionCode / versionName
```

| What | Where |
| --- | --- |
| the APK | `http://<host>:5001/download/awefit.apk` |
| metadata | `http://<host>:5001/api/app/version` |

Builds are published to `releases/` at the repo root (gitignored) and served by
a Flask route — **not** from `app/static/`, which `vite build` empties on every
web build. The app itself polls `/api/app/version` and offers the download when
the published `versionCode` is newer than the installed one.

**Install / update on the phone:** open that URL, download, tap the file. Android
asks once for permission to install unknown apps. An update installs *over* the
existing app only when it is signed with the same keystore and its `versionCode`
is higher — `--bump` handles the second part, and the keystore is backed up.

- App id `dev.awefit.app` (permanent once installed), label AweFit,
  minSdk 24, targetSdk 36.
- The server address is baked in at build time:
  `ANDROID_SERVER_URL=http://... ./scripts/build-android.sh` (default is the
  Tailscale address, because the LAN address is DHCP).
- Server over HTTPS: see **Tailscale HTTPS** below — the APK then talks to
  `https://home-server-1.<tailnet>.ts.net` instead of a raw address.
- Signing key: `~/.android-keys/awefit-release.jks`, referenced by the
  gitignored `frontend/android/keystore.properties`, snapshotted by
  `scripts/backup.sh` → `backups/keys/`. Losing it means every install must be
  uninstalled before the next one works.

## Tailscale HTTPS

The stable, certificate-backed address for the app is
`https://home-server-1.tail96ee52.ts.net` (the `.ts.net` name never changes,
unlike the DHCP LAN address). Two one-time steps in the Tailscale admin console
are required before it works — both are manual by design, which is why they are
written down here rather than automated:

1. **Enable Serve** for the tailnet: <https://login.tailscale.com/f/serve>
   (Enabling it also enables HTTPS certificates.)
2. **Let the user manage serve without root** (otherwise every command below
   needs `sudo`):

   ```bash
   sudo tailscale set --operator=angrygiant
   ```

Then:

```bash
tailscale serve --bg 5001                     # https://<node>.<tailnet>.ts.net -> :5001
tailscale serve status                        # confirm
curl -sI https://home-server-1.tail96ee52.ts.net/ | head -1
```

Build the APK against the HTTPS origin (no cleartext, no DHCP churn):

```bash
ANDROID_SERVER_URL=https://home-server-1.tail96ee52.ts.net ./scripts/build-android.sh --bump
```

Notes:

- The page and the API share one origin either way, so no CORS entry is needed.
- `SESSION_COOKIE_SECURE` stays off by default: the same app is still reachable
  over plain HTTP on the LAN, and a Secure cookie is silently dropped there —
  which presents as "logging in does nothing". Set
  `SESSION_COOKIE_SECURE=true` only if the app becomes HTTPS-only.
- `SESSION_PROTECTION` defaults to `basic`. Flask-Login's `strong` mode ties a
  session to the client IP, so the phone would be logged out every time it moved
  between the LAN address and the `.ts.net` name.

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
- Per-entry photos with upload/replace/delete, plus quick add, barcode lookup
  and photo-based logging
- Barcode lookup checks your own foods first, then OpenFoodFacts, and caches a
  found product as one of your foods so the second scan is instant and offline.
  Camera scanning is the next ticket (FF-0030); today the code is typed.
- Weight and exercise tracking, BMR/TDEE and macro goals, weekly goal
- AI assistance (exercise calorie estimation, meal photo analysis) through a
  local llama-swap endpoint

The Edit Food Log design notes live in
`docs/superpowers/specs/2026-06-10-edit-food-log-design.html`.
