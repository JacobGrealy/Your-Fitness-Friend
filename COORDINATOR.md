# Coordinator role — the loop

The agent's role on this project: **pick work from the queue, do it, verify it,
close it out, chain the next.** This file owns the role split and the loop only.
Procedure for each step lives in one project skill (`.dsh/skills/`), state lives
in the ticket registry and `docs/autonomy/`, and nothing is restated here.

## The split

| Phase | Owner | Where the procedure lives |
| --- | --- | --- |
| Pick the next task | coordinator | `python3 tasks/scripts/tasks.py next` |
| Implement it on a branch | coordinator, or one subagent for a self-contained slice | `ff-work-ticket` |
| Verify | coordinator | `ff-gates` |
| Close out: journal, decisions, commit, merge, branch delete, queue | coordinator | `ff-closeout` |
| Chain the next task | coordinator | this file |

**One ticket at a time.** The queue is the work order; a round ends when a
ticket is merged and its closeout is written, or when it is parked as blocked.

## Delegation

- Use the **standard subagent tools** — they run the same model this session
  runs. Do not build project-specific agent wrappers; AweCraft's effort-routed
  custom builders are deliberately *not* mirrored here.
- **Parallelism is allowed and encouraged** where slices are independent: a
  research sweep, a test suite, an independent review of a diff.
- **Serialise anything that shares the checkout**: two agents running
  `npm run build`, `./scripts/gates.sh`, or `git switch` in the same working
  tree will collide. Fan out on reads and reviews; keep writes to one lane per
  checkout (or use a `git worktree` per lane).
- A delegated slice comes back with its own gates green or it does not count.

## Sizing — split before you delegate

A subagent gets one turn with a finite budget. A ticket that spans backend
schema + API + frontend + tests comes back half-done with its reds found late.
Split it first: each piece becomes its own ticket with its own acceptance
criteria, worked in order. Splitting is cheap; a half-landed ticket is not.

## When the queue is empty

Report and stop. Do not invent tickets. New work comes from the owner, or from
a `QUESTIONS.md` answer.
