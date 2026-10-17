# FitnessFriend Development Guidelines

## Environment Setup

### Python (Backend)
- **ALWAYS use the project venv** at `./venv/bin/python` and `./venv/bin/pip`
- Do NOT install packages system-wide or use the system Python
- Example: `./venv/bin/python -m pytest tests/`

### Node.js (Frontend)
- Use full path: `/home/angrygiant/.nvm/versions/node/v22.22.2/bin/node`
- Use `npm` commands from within the `frontend/` directory
- The npm test scripts pin `NODE_ENV=test`. If `NODE_ENV=production` is set in
  your environment and you invoke `jest` directly, React loads its production
  build and every DOM test fails with `act(...) is not supported in production
  builds of React` — 55 of 92 tests, which looks like mass breakage but is not.

## Testing
- Backend: `./venv/bin/python -m pytest tests/` — currently 40 passed, 21 skipped.
  The skips are expected, not breakage: 7 skip on a SQLAlchemy `__version__`
  detection quirk and the rest carry `Requires session handling fix`.
- Frontend: `cd frontend && npm test` — 92 tests. They live in `frontend/tests/`,
  not next to the sources in `src/`.
- Type check: `cd frontend && npx tsc --noEmit`

## Runtime topology
- **Production** — `fitnessfriend.service`: gunicorn on `0.0.0.0:5001`, serving
  both the Flask API and the built SPA from `app/static`.
- **Dev** — `fitness-frontend.service`: Vite on `0.0.0.0:5173`, proxying `/api`
  and `/uploads` to `:5001`.
- The LAN address is DHCP and moves; prefer the Tailscale address when you need
  something stable, and check the current IP rather than assuming.
- **Do not enable `fitness-backend.service`.** It is a superseded duplicate that
  ran the Flask dev server on the same port 5001 and crash-looped ~377,000 times
  (about 15,000 restarts per day). `install-dev-services.sh` still installs and
  enables it — re-running that script recreates the loop.

## Database & migrations
- The live database is `instance/fitness_friend.db`. Flask-SQLAlchemy resolves
  the relative `sqlite:///` URI into `instance/`. The `app.db` file at the repo
  root is an unused 0-byte leftover — do not query it or conclude data is missing.
- The Alembic CLI is **not configured** here (`FAILED: No 'script_location' key
  found in configuration`). Use Flask-Migrate instead:
  `FLASK_APP=main.py ./venv/bin/flask db heads|upgrade|revision|current`
- Commit every migration. The database's `alembic_version` and the files in git
  must agree; a migration left uncommitted means a fresh `upgrade head` dies with
  "Can't locate revision".

## Build & deploy
- `cd frontend && npm run build` is `tsc && vite build` and writes to
  `app/static`. It is the type gate and fails on any TypeScript error.
- `deploy-production.sh` calls `vite build` **directly and skips `tsc`**, so a
  type error can reach production uncaught. Run `npx tsc --noEmit` before
  deploying.
- `app/static` must be writable by the user running the build. A deploy run via
  `sudo` leaves root-owned `assets/`/`icons/` directories, after which every
  later build fails with `EACCES: permission denied, unlink`.
- Backend code changes need `sudo systemctl restart fitnessfriend` (gunicorn, 2
  workers, no auto-reload). Rebuilding static files alone needs no restart.

## Configuration
- `FLASK_ENV` / `FLASK_CONFIG` selects the config class (`production`,
  `development`, `testing`). Production must resolve to `production`, or `DEBUG`
  is on and tracebacks and source paths leak to clients. Unknown values raise
  rather than silently falling back to development.
- `CORS_ORIGINS` is a comma-separated allowlist for cross-origin API calls. It is
  only needed when the frontend origin differs from the backend's — the Vite dev
  proxy and production are both same-origin.
- Other variables: `SECRET_KEY`, `DATABASE_URL`, `LLM_API_URL`, `QWEN_BASE_URL`.
  `run-backend.sh` sources `.env` and exports them.

## Branching
- When working on a feature or bug fix, create a feature branch (e.g., `feat/add-food-redesign` or `fix/diary-date-nav`)
- Do not wait for user confirmation — create the branch proactively
- Switch to the feature branch before starting work
- Commit work to the feature branch
