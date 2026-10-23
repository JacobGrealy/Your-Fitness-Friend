# FitnessFriend Development Guidelines

## Start of session

1. `COORDINATOR.md` — the loop: pick, implement, verify, close out, chain.
2. `docs/autonomy/JOURNAL.md` — **newest entry last**; current state and what the
   last round handed over.
3. `python3 tasks/scripts/tasks.py next` — the queue is the work order.
4. `docs/autonomy/QUESTIONS.md` — anything already waiting on the owner.
5. The live board, if it is running: `http://<lan-ip>:5181/` —
   `python3 tasks/webui.py --daemon` starts it (see `tasks/AGENTS.md`).

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
9. **All implementation is delegated to subagents.** Every implementation ticket
   — application code, scripts, tests — is carried by a subagent with a **clean
   context**, not by the long-running coordinating session. Clean context is the
   point: a fresh subagent reads the ticket and the code it needs instead of
   inheriting rounds of history. The coordinator investigates, files tickets,
   writes the brief, reviews the diff, merges, deploys, and owns the registry and
   the journal. It does not implement.

   Because a subagent does not see the coordinating conversation, **the brief must
   stand alone**: the ticket's notes, the exact files, the traps, the acceptance
   criterion, and what not to touch.

   The lane protocol below exists because this is one checkout with one live
   server:

   - A subagent works **only** on its own feature branch cut from `master`, one
     ticket, and **never** merges or pushes. Merges are serialised here.
   - A subagent **never** runs `npm run build`, `scripts/build-android.sh`,
     `deploy-production.sh` or anything else that writes `app/static`: it is a
     single build output that the running server serves, so two lanes would
     clobber each other. Deploys happen after the merge, from this lane.
   - A subagent **never** touches `tasks/TASKS.yaml`, starts/stops the services,
     restarts the board daemon, or runs migrations against `instance/`.
   - Give parallel lanes tickets that touch **disjoint files**. If two tickets
     touch the same file, they go to one lane, whatever else is true.
   - Concurrent gates are safe: the smoke gate binds a dynamically chosen port,
     and `instance/` is per-worktree, so two runs do not collide on either. They
     do compete for CPU, which is only a speed cost.
   - Fan out read-only work (audits, reviews, research) freely — that is the
     cheapest parallelism available and needs no protocol at all.

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
- Frontend: `cd frontend && npm test` — 178 tests. They live in `frontend/tests/`,
  not next to the sources in `src/`.
- Type check: `cd frontend && npx tsc --noEmit`
- The route tests stub `qwen_client` so the suite never calls the local model.
  Keep that up: a real model call makes tests slow and nondeterministic.

## Verification against a throwaway server

- **`./scripts/dev-server.sh` starts an isolated server**: it copies the live database and
  points `UPLOAD_FOLDER` at a temp directory, prints both paths and the URL, and removes
  the whole tree on exit (`--port` to pin, `--keep` to keep). Use it for any browser or
  curl check.
- Two incidents motivated it: verification runs copied the database by hand and still
  wrote photos into the real `app/uploads/`, and a later cleanup that swept "unreferenced"
  files had to be restored from a snapshot.
- Tests and gates are isolated too: the `app` fixture points `UPLOAD_FOLDER` at a scratch
  directory, and the smoke gate sets its own. `./scripts/gates.sh` must leave
  `find app/uploads -type f | wc -l` unchanged — check it if you touch uploads.
- Upload paths have **one home**, `app/utils/uploads.py`. The `uploads` gate fails on a
  module that joins `root_path` with `'uploads'` or writes the literal anywhere except
  `app/utils/uploads.py` and `app/config.py`.

## UI layering
- **Dialogs and sheets must outrank the mobile footer.** `BottomNav` is fixed at `z-40` and
  every overlay (modals, bottom sheets, the loading screen) is `z-50`; equal z-index resolves
  by DOM order and the nav renders last, so matching them hides a sheet's bottom rows behind the
  footer — that is what buried "Choose from gallery" (FF-0100). Bottom-anchored panels also
  carry `pb-[calc(1rem+env(safe-area-inset-bottom))]` so their buttons clear a home indicator.

## Reminder scheduling
- **Do not restore unconditional repeating LocalNotifications alarms.** Smart reminders use
  `SmartRemindersPlugin` / `SmartReminderReceiver`: completion is scoped to user and local date,
  future occurrences are re-armed natively, and only successful dated-log reads can clear a
  completion flag. Unknown/offline status is not an empty diary. Legacy ids (1001–1010) and
  smart ids (21001–21010) stay separate so migration cannot dismiss current smart reminders.
  Native reminder changes require publishing an APK, not just rebuilding the web bundle.

## Exercise session photos
- Exercise photos belong to individual logs, not catalog activities. New typed sessions use
  one multipart save (`data` JSON plus optional `photo`) so a failed save leaves no staged
  upload. Use `app/utils/exercise_photos.py` for decoded/re-encoded images and the central
  reference-aware cleanup in `app/utils/uploads.py`; never delete a shared file directly.
  Read images through the ownership-checked `/api/exercise/log/:id/photo` endpoint. Repeating
  a session must not silently copy its photo. New file rollback must preserve the old image.

## Photo thumbnails
- List/diary image requests may append `thumbnail=1` to the existing photo URL. Generate derivative
  JPEGs lazily with `app/utils/photo_thumbnails.py` only after ownership/reference authorization;
  keep stored full-size originals unchanged. Cached files are internal and blocked on raw upload
  routes. Full-screen viewers, editors and AI inputs retain original URLs. Reference-aware removal
  deletes derivatives only when the last original reference disappears. Existing images need no
  destructive backfill; generation failures fall back to the authorized full-size image.

## Diary copying
- Exercise/medication/bowel copies require explicit source and destination dates, selected own
  log ids and confirmation. Health copies record actual events, not a schedule or automatic intake.
  Use `app/utils/diary_copy.py`: copy all selected entries transactionally and persist the user-scoped
  request id/fingerprint with results. Retry the same operation with the same request id; never
  regenerate it after a network error. Typed exercise estimates use destination-date weight, raw
  manual overrides remain raw, legacy estimates are preserved with disclosure, and photos are not
  inherited. Keep source entries unchanged and preserve health local clock times/doses.

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
- **Shipping an update** (verified end to end 2026-10-17): run
  `./scripts/build-android.sh --bump`. It publishes to `releases/`, and
  `/api/app/version` reads `releases/version.json` **per request**, so installed
  clients show the update banner on their next request — no backend restart. The
  banner's Get it button then downloads the APK and starts Android's installer from
  inside the app (`ApkInstallerPlugin`, FF-0044); publishing a build never installs
  anything by itself.
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
