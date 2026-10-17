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
python3 tasks/scripts/tasks.py queue move --id FF-0003 --to top  # or a position / 'after FF-0001'
python3 tasks/scripts/tasks.py queue reorder FF-0002 FF-0001     # whole queue, new order
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

## The board

`tasks/webui.py` serves the registry as a live board — the same one AweCraft has,
ported:

```bash
python3 tasks/webui.py --daemon          # http://<lan-ip>:5181/
python3 tasks/webui.py --port 5182 --sandbox /tmp/board   # throwaway copy
python3 tasks/webui.py --replace          # reclaim the port from a stale instance
```

- **Port 5181** (AweCraft's board holds 5180). Binds `0.0.0.0` with **no auth** —
  the owner's explicit choice, so the board is readable and editable from any
  device on the LAN or tailnet. Keep that in mind before putting anything private
  in a ticket's notes.
- **Both clients share one renderer.** `tasks/scripts/render.py` builds the board;
  the server serves it and `python3 tasks/scripts/render.py > board.html` saves the
  same view as a file. Change the layout there, once.
- **Both clients share one mutation layer.** The board's actions call the same
  `tasks_lib` functions the CLI does, so anything the board can do, the CLI can
  too — that is why `queue move`/`queue reorder` exist.
- `--sandbox DIR` copies the registry into `DIR` and works there; every write
  lands in the copy, never the live `TASKS.yaml`. It is how the tooling gate
  exercises the board over real HTTP without touching the real queue.
