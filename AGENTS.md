# FitnessFriend Development Guidelines

## Start of session

1. `COORDINATOR.md` — the loop: pick, implement, verify, close out, chain.
2. `docs/autonomy/JOURNAL.md` — **newest entry last**; current state and what the
   last round handed over.
3. `python3 tasks/scripts/tasks.py next` — the queue is the work order.
4. `docs/autonomy/QUESTIONS.md` — anything already waiting on the owner.

Procedure lives in the project skills, not here: `ff-work-ticket`, `ff-gates`,
`ff-closeout`. State lives in `tasks/TASKS.yaml` and `docs/autonomy/`.

## Autonomy invariants — never violate these, whatever else you read

1. **Every change is a ticket** (`FF-NNNN`). `tasks/TASKS.yaml` is mutated
   **only** through `python3 tasks/scripts/tasks.py`; hand edits are forbidden.
2. **Green gates before merge**: `./scripts/gates.sh` — pytest, jest, tsc and the
   throwaway-server smoke. A round that cannot go green is parked as `blocked`
   with a line in `QUESTIONS.md`, not merged hopefully.
3. **One ticket, one branch, automerge on green**, then delete the branch
   locally and on origin. Never delete an unmerged branch without asking.
4. **A durable rule has one home.** A standing rule discovered in a ticket goes
   into this file or the relevant skill at closeout — never only in the journal,
   which is chronological, and never only in a ticket folder.
5. **Never write inside `backups/`** — uploads snapshots share inodes with the
   live tree. Restore by copying *out*. Run `./scripts/backup.sh` before any
   schema change (see "Database & migrations").
6. **Never `git add -A`** — this tree carries `.scratch/`, `.opencode/`,
   `.playwright-cli/`, `app/uploads/` and `backups/`. Stage explicit paths and
   print the staged list before writing the message.
7. **Privileged commands**: `sudo` needs an interactive password on this host.
   The only passwordless path is the drop-in in
   `scripts/sudoers.d/fitnessfriend-agents` (restart/status of the two units);
   if it is not installed, note "awaiting restart" and continue the round.
8. **Park, don't thrash**: two attempts at a red gate, then file the reason and
   move to the next ticket.
9. **Delegation uses the standard subagent tools** (same model as this session).
   Fan out freely on reads and reviews; keep anything that builds, runs gates or
   switches branches in one lane, because it shares this checkout.

## Environment Setup

### Python (Backend)
- **ALWAYS use the project venv** at `./venv/bin/python` and `./venv/bin/pip`
- Do NOT install packages system-wide or use the system Python
- Example: `./venv/bin/python -m pytest tests/`

### Node.js (Frontend)
- Use full path: `/home/angrygiant/.nvm/versions/node/v22.22.2/bin/node`
- Use `npm` commands from within the `frontend/` directory
- **This shell exports `NODE_ENV=production`**, and npm omits devDependencies
  under it: `npm install` reports success while `@capacitor/cli`, jest and
  typescript are never written to `node_modules`. Install with
  `NODE_ENV=development npm install --include=dev`.
- The npm test scripts pin `NODE_ENV=test`. If `NODE_ENV=production` is set in
  your environment and you invoke `jest` directly, React loads its production
  build and every DOM test fails with `act(...) is not supported in production
  builds of React` — 55 of 92 tests, which looks like mass breakage but is not.

## Testing
- Backend: `./venv/bin/python -m pytest tests/` — 127 passed, nothing skipped.
- Frontend: `cd frontend && npm test` — 171 tests. They live in `frontend/tests/`,
  not next to the sources in `src/`.
- Type check: `cd frontend && npx tsc --noEmit`
- The route tests stub `qwen_client` so the suite never calls the local model.
  Keep that up: a real model call makes tests slow and nondeterministic.

## Runtime topology
- **Production** — `fitnessfriend.service`: gunicorn on `0.0.0.0:5001`, serving
  both the Flask API and the built SPA from `app/static`.
- **Dev** — `fitness-frontend.service`: Vite on `0.0.0.0:5173`, proxying `/api`
  and `/uploads` to `:5001`.
- The LAN address is DHCP and moves; prefer the Tailscale address when you need
  something stable, and check the current IP rather than assuming.
- `fitness-backend.service` is gone from this repo. It was a duplicate Flask dev
  server on port 5001 that lost the port race on every boot and crash-looped
  ~377,000 times. A host may still have an old copy installed — leave it
  disabled, or remove it. `install-dev-services.sh` only installs the frontend
  now, so it cannot bring the loop back.

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
- `FLASK_CONFIG=testing` selects **`sqlite:///:memory:`** (TestingConfig), which
  silently ignores `DATABASE_URL`. Any migration work against a real file must
  use `FLASK_CONFIG=production` (or development) — otherwise the migration runs
  in a throwaway in-memory database and looks successful while writing nothing.
- A fresh install must build from migrations alone: `tests/test_migrations.py`
  runs `flask db upgrade` on an empty file, checks the head revision, and fails
  if a model has no migration. It caught a duplicate `meal_photos` creation that
  had made every fresh install impossible.
- **Snapshot before touching the live schema.** `./scripts/backup.sh` takes a
  verified copy in under a second; run it before any `flask db upgrade` against
  `instance/fitness_friend.db`. Restore steps are in README's "Backups" section.

## Backups
- `scripts/backup.sh` writes to `backups/` (gitignored): the database via
  SQLite's online backup API with an integrity check, `app/uploads/` via
  `rsync --link-dest` hardlinks, and `.env` at mode 600. Retention is 14.
- Scheduled from the **user** crontab at 03:15 daily (`crontab -l`). The script
  exports its own `PATH` because cron's environment is minimal; keep that if you
  edit it. Output goes to `logs/backup.log`.
- Local only — same filesystem, so it survives mistakes but not disk failure.
- Never edit a file in `backups/`: uploads snapshots share inodes, so writing
  through a snapshot corrupts the live tree too. Restore by copying *out*.

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
- Other variables: `SECRET_KEY`, `DATABASE_URL`, `QWEN_BASE_URL`, `QWEN_MODEL`.
  `run-backend.sh` sources `.env` and exports them.
- All AI features go through `app/utils/qwen_client.py` (`QwenClient`) to the
  llama-swap endpoint on port 1234. `QWEN_MODEL` must name a model the server
  actually serves — check `curl -s localhost:1234/v1/models`. A wrong id is
  rejected with "could not find suitable inference handler" and the routes
  silently fall back (MET estimate, unauthored meal analysis), so AI quietly
  stops working instead of erroring.

## Android — AweFit
- **AweFit is a thin Capacitor client.** The WebView loads the real app from
  `ANDROID_SERVER_URL` instead of a bundled copy, so the session cookie, CORS,
  `/uploads` and relative photo URLs behave exactly as in a browser. The server
  must be reachable; there is no offline mode. Rationale: DECISIONS.md.
- App id `dev.awefit.app`, label `AweFit` — the id is permanent once installed.
- Toolchain lives **outside the repo**: `./scripts/android-toolchain.sh`
  installs Temurin JDK 21 + Android SDK 36 under `~/tools`, and writes
  `~/tools/android-sdk/env.sh`. Source it before any Gradle work
  (`JAVA_HOME`, `ANDROID_HOME`, `adb` on PATH). `--check` reports only.
- Capacitor 8 ⇒ compileSdk/targetSdk 36, minSdk 24, AGP 8.13, Node 22+.
- `cd frontend && npm run android:sync` builds the SPA and copies it into the
  native project; `npm run android:debug` goes on to assemble a debug APK.
  `frontend/android/` is committed; its `build/`, `local.properties` and copied
  web assets are gitignored by Capacitor's own `.gitignore`.
- The Android server URL is baked at sync time and defaults to
  **`https://home-server-1.tail96ee52.ts.net`** (Tailscale Serve, FF-0008). It is
  stable, publicly trusted (Let's Encrypt via Tailscale), and a secure context —
  which is what the camera barcode scanner requires. Set `ANDROID_SERVER_URL` to
  override (e.g. the LAN address for testing) and re-sync.
- The default lives in **two** places that must stay in step:
  `scripts/build-android.sh` (wins — the sync reads the exported value) and
  `frontend/capacitor.config.ts`. `build-android.sh` warns when the baked URL is
  cleartext `http://`, because such an origin is **not** a secure context and the
  camera scanner silently cannot work there.
- `SESSION_COOKIE_SECURE=true` is set in `.env` for the HTTPS origin. The cookie
  is then only sent over `https://`, so a plain-HTTP LAN login stops working —
  that is the intended trade.

## Branching
- When working on a feature or bug fix, create a feature branch (e.g., `feat/add-food-redesign` or `fix/diary-date-nav`)
- Do not wait for user confirmation — create the branch proactively
- Switch to the feature branch before starting work
- Commit work to the feature branch
- Once a branch is merged into `master`, delete it — locally and on `origin` —
  without asking for approval:
  `git branch -d <branch> && git push origin --delete <branch>`
- Never delete an unmerged branch on your own judgement; those represent work
  that has not landed, so ask first.
