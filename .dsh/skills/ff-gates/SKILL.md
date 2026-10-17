---
name: ff-gates
description: Use when verifying FitnessFriend work — which gates to run, what they cover, and what a red gate means before a merge.
---

# Gates

```bash
./scripts/gates.sh            # all four, exit 0 only when every one passed
./scripts/gates.sh backend    # pytest
./scripts/gates.sh frontend   # jest + tsc
./scripts/gates.sh smoke      # throwaway server + curls
```

| Gate | Command | Covers | Runtime |
| --- | --- | --- | --- |
| backend | `./venv/bin/python -m pytest tests/` | 90 tests: routes, models, config, auth | ~3 s |
| jest | `cd frontend && npm test` | 92 tests in `frontend/tests/` | ~5 s |
| tsc | `cd frontend && npx tsc --noEmit` | the type gate `deploy-production.sh` skips | ~5 s |
| smoke | boots gunicorn, curls it, kills it | SPA shell serves, API 404 is JSON, unauthenticated API is 401 | ~2 s |

**Minimum for a merge: all four.** A backend-only change still runs jest and
tsc, because a store or type touched from both sides breaks silently.

## What the smoke gate guarantees, and what it does not

It runs `create_app()` under `FLASK_ENV=production` with `DATABASE_URL` pointed
at a **copy** of `instance/fitness_friend.db` in a temp dir, on a free port. It
proves the app boots in production configuration and that routing, JSON 404s and
the auth guard are wired. It does **not** exercise a logged-in flow, AI calls, or
uploads. Those belong in pytest, which stubs the model deliberately: a real
`QwenClient` call makes the suite slow and nondeterministic.

## Red gates

- **Do not merge.** Fix forward on the same branch while the cause is clear.
- **Two attempts, then park.** Set the ticket `blocked`, write one line into
  `docs/autonomy/QUESTIONS.md` describing the failure and what you tried, and
  move to the next ticket. Never leave a branch unmerged and unrecorded.
- **Quarantine is not a fix.** Deleting or skipping a failing test to go green is
  a lie told to the next round. If a test is genuinely obsolete, say so in the
  ticket and replace it with one that asserts the current contract.

## Nondeterminism to watch for

- `NODE_ENV=production` in the shell makes React load its production build and
  every DOM test fails with `act(...) is not supported` — the npm scripts pin
  `NODE_ENV=test`, so call `npm test`, not `jest` directly.
- The smoke gate fails to bind if something is already on the port it chose; it
  picks a free one, so a bind failure is a real error, not a collision.
- `app/static` must be writable by the current user. A build once run under
  `sudo` leaves root-owned dirs and every later `vite build` fails `EACCES`.
