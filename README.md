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
| `fitness-frontend.service` | Vite dev server on `0.0.0.0:5173` |
| `fitness-backend.service` | **Retired duplicate — leave disabled.** It ran a Flask dev server on the same port and crash-looped. |

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

## Status

The **Edit Food Log** feature (edit an existing entry, attach per-entry photos)
is in progress on `feat/edit-food-log`. The page, design spec and mockups exist,
but it still needs: the `/food/log/:id/edit` route, the `foodStore` methods, the
backend `GET /food/log/<id>` and photo endpoints, and `FoodLog` model fields for
`number_of_servings` / `photo_url`.
