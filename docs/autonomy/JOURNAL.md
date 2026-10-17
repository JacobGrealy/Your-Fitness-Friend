# Journal

Append-only. Newest entry **last**. One entry per autonomous round: what landed,
which gates passed, the commit, and what the next round should pick up.

This file is the memory that survives context compaction. A resumed session
reads the last entry first, then `tasks.py next`. Nothing else is assumed.

---

## Round 0 — 2026-10-17 — planning (no code)

Owner asked for an Android sideload plan and an autonomous-operation plan
modelled on AweCraft. Both were written, reviewed, and answered:

- Android: thin Capacitor client (`server.url`), **AweFit**, `dev.awefit.app`,
  new AF icon, camera capture required, LAN APK updates, Tailscale HTTPS.
- Autonomy: port `tasks.py` verbatim, automerge on green, no round limit, no
  STOP file, sudoers drop-in for restarts, standard subagent tools (no custom
  builders).

## Round 1 — 2026-10-17 — autonomy scaffold (FF-0001)

Landed:

- `tasks/scripts/tasks.py` + `tasks_lib.py`, ported from AweCraft with
  `FF-NNNN` ids (single-writer YAML registry, flock, atomic replace, queue).
- `tasks/TASKS.yaml` seeded with 29 tickets: the Android/AweFit track first,
  then the open `TODO.md` bugs, then the feature backlog.
- `scripts/gates.sh` — pytest, jest, tsc, and a throwaway-gunicorn smoke gate
  that runs against a copy of the database, never the live one.
- `COORDINATOR.md`, `docs/autonomy/{JOURNAL,QUESTIONS,DECISIONS}.md`,
  `.dsh/skills/ff-{work-ticket,gates,closeout}`, `tasks/AGENTS.md`.
- `scripts/sudoers.d/fitnessfriend-agents` — passwordless restart for the two
  services, pending a one-time install by the owner (needs root).

Next: FF-0002 (Android toolchain), then FF-0003 (Capacitor scaffold).
