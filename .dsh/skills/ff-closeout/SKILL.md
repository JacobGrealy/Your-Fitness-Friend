---
name: ff-closeout
description: Use when closing out a FitnessFriend ticket after its gates pass — journal entry, decisions, commit, merge, branch delete, and registry update.
---

# Closing out a ticket

All of this, or the ticket is not closed.

## 1. Commit

```bash
git add <explicit paths>          # never `git add -A`: this tree carries
git diff --cached --name-only     # .scratch/, .opencode/, uploads, backups/
git status --short                # cross-check the staged list before messaging
git commit -m "feat(FF-NNNN): ..."
```

Never redirect `git add`'s stderr to `/dev/null` — an unmatched pathspec makes
it abort silently and you commit nothing. Never hand-edit generated output
(`app/static/`, `frontend/dist/`, `android/app/build/`).

## 2. Merge and delete

```bash
git switch master
git merge --no-ff feat/FF-NNNN-slug
git push origin master
git branch -d feat/FF-NNNN-slug
git push origin --delete feat/FF-NNNN-slug   # only if the branch was pushed
```

A merged branch is deleted without asking — that is the owner's standing rule. An
**unmerged** branch is never deleted on your own judgement; ask.

## 3. Deploy, if the change is live-facing

- Frontend changed → `cd frontend && npm run build` (writes `app/static`; needs no
  restart).
- Backend changed → `sudo systemctl restart fitnessfriend`. This needs the
  sudoers drop-in; if it is not installed, do **not** burn the round on it —
  note "awaiting restart" in the journal and continue.
- Schema changed → `./scripts/backup.sh` first, then
  `FLASK_APP=main.py ./venv/bin/flask db upgrade`.

## 4. Registry

```bash
python3 tasks/scripts/tasks.py set --id FF-NNNN --status done
python3 tasks/scripts/tasks.py queue remove --id FF-NNNN
python3 tasks/scripts/tasks.py note --id FF-NNNN --append-text "gates: green; commit <sha>"
```

## 5. Journal and decisions

Append one entry to `docs/autonomy/JOURNAL.md` (newest last):

```markdown
## Round N — YYYY-MM-DD — FF-NNNN <title>
Landed: <what changed, in one or two lines>
Gates: backend/jest/tsc/smoke — pass
Commit: <sha>
Next: <the queue's next ticket, or why you stopped>
```

A **durable rule** discovered while working goes into `AGENTS.md` or the relevant
skill, not just the journal — the journal is chronological, a rule needs a home.
A reversible technical call goes to `docs/autonomy/DECISIONS.md`. Anything
needing the owner goes to `docs/autonomy/QUESTIONS.md` and the round continues.

## 6. Chain

Back to `tasks.py next`. Do not stop to ask "shall I continue?" — the queue is
the instruction. Stop only when the queue is empty, a gate is parked as blocked,
or the owner's direction is genuinely required.
