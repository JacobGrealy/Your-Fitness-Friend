---
name: ff-work-ticket
description: Use when starting a ticket from tasks/TASKS.yaml on FitnessFriend — branch, implement, satisfy the ticket's acceptance criteria, and hand off to gates.
---

# Working a ticket

## 1. Take it

```bash
python3 tasks/scripts/tasks.py next      # the queue decides, not you
python3 tasks/scripts/tasks.py show --id FF-NNNN
python3 tasks/scripts/tasks.py set --id FF-NNNN --status in-progress
git switch -c feat/FF-NNNN-slug
```

One ticket, one branch. If the ticket turns out to span backend + API +
frontend, stop and file the extra pieces as their own tickets
(`tasks.py add ... --queue 'after FF-NNNN'`) — see `COORDINATOR.md` on sizing.

## 2. Read before writing

The ticket's `2) Technical Details` note names the files. Read them. This
project's recurring failure is a change made against an assumed schema.

Ground rules that cost real time when forgotten (the full list is `AGENTS.md`):

- Project venv only: `./venv/bin/python`, `./venv/bin/pip`.
- Node is in nvm — `export PATH="/home/angrygiant/.nvm/versions/node/v22.22.2/bin:$PATH"`
  or use absolute paths. `npx` fails without it.
- Live database is `instance/fitness_friend.db`; `./scripts/backup.sh` before
  anything that touches schema or data, and before any `flask db upgrade`.
- Migrations: `FLASK_APP=main.py ./venv/bin/flask db revision -m "..."`. Commit
  the generated file or a fresh `upgrade head` dies.
- Frontend tests live in `frontend/tests/`, not beside the sources.
- Photo/cookie/API plumbing assumes same-origin. AweFit is the same origin,
  which is exactly why the client is thin.

## 3. Implement

- Match the surrounding code's style and error shape (`{'error': ...}` with a
  real status code; 404 not 403 for another user's resource).
- Every new backend behaviour gets a test in `tests/`; every new frontend
  component or store action gets one in `frontend/tests/`.
- Keep the diff to the ticket. An unrelated improvement noticed on the way is a
  new ticket, not a drive-by edit.

## 4. Verify

```bash
./scripts/gates.sh
```

Green, or the ticket does not proceed. Then `ff-closeout`.
