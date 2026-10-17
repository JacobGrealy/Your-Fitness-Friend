# tasks/ — the ticket system (scope rules)

`tasks/TASKS.yaml` is the **work order**: a registry of tickets plus a queue.
It is written **only** through `tasks/scripts/tasks.py` — hand edits are
forbidden. Every write takes `flock` on `tasks/.tasks.lock`, dumps canonical
YAML, replaces the file atomically, and re-reads it to verify the change landed.

```bash
python3 tasks/scripts/tasks.py next                              # what to work on
python3 tasks/scripts/tasks.py show --id FF-0003                 # one ticket
python3 tasks/scripts/tasks.py list --status open                # the inbox
python3 tasks/scripts/tasks.py queue list                        # the ordered queue
python3 tasks/scripts/tasks.py add --title "..." --priority 2 --queue end
python3 tasks/scripts/tasks.py set --id FF-0003 --status in-progress
python3 tasks/scripts/tasks.py queue remove --id FF-0003
```

- Statuses: `open`, `in-progress`, `blocked`, `done`, `cancelled`.
  Priorities: `1` (do it now), `2` (normal), `3` (someday).
- **`queue` is ordered; `intake` is unordered.** `next` reads the queue only.
  A ticket that is not queued is not being worked, however urgent it looks.
- Filing a ticket needs both notes sections, or it is not a ticket:
  **`1) User Story`** — plain language, what changes for the person using the app;
  **`2) Technical Details`** — files, endpoints, verify steps, and the trap that
  makes this ticket necessary.
- Per-ticket folder `tasks/FF-NNNN/` is a filing cabinet, not a manual:
  `spec.md` (the requirement), optional evidence. Design reasoning belongs in
  `docs/`, procedure in `.dsh/skills/`, current state in `docs/autonomy/`.
- `TODO.md` is the owner's gitignored scratch inbox. It is not the queue; open
  items there get filed as tickets before any round may work them.
