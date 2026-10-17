#!/usr/bin/env python3
"""Self-test for the ticket CLI (tasks/scripts/tasks.py).

Run: python3 tasks/scripts/test_tasks.py      (needs PyYAML, as the CLI does)

Everything runs against a sandbox copy of TASKS.yaml selected through
FF_TASKS_FILE, so the live registry is never touched — the test asserts that by
hashing the live file before and after.
"""

import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

SCRIPTS = Path(__file__).resolve().parent
CLI = SCRIPTS / "tasks.py"
LIVE = SCRIPTS.parent / "TASKS.yaml"

PASSED = []
FAILED = []


def check(name, condition, detail=""):
    if condition:
        PASSED.append(name)
        print("  ok   %s" % name)
    else:
        FAILED.append((name, detail))
        print("  FAIL %s  %s" % (name, detail))


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run_cli(*args, sandbox=None):
    env = dict(os.environ)
    if sandbox:
        env["FF_TASKS_FILE"] = str(sandbox)
    cmd = [sys.executable, str(CLI)] + list(args)
    return subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=env)


def main():
    live_before = sha(LIVE)
    tmp = Path(tempfile.mkdtemp(prefix="ff-tasks-test."))
    sandbox = tmp / "TASKS.yaml"
    shutil.copy(LIVE, sandbox)

    print("\n-- read commands (sandbox: %s)" % sandbox)
    p = run_cli("next", sandbox=sandbox)
    check("next exits 0", p.returncode == 0, p.stderr)
    # An empty queue is the goal state, not a failure: the loop is supposed to
    # work the backlog to empty. Either answer is correct against the live file;
    # the populated case is asserted against the sandbox fixture further down.
    check("next names a queue id or reports empty",
          "next: FF-" in p.stdout or "queue has no live items" in p.stdout,
          p.stdout.strip())

    p = run_cli("queue", "list", sandbox=sandbox)
    check("queue list non-empty", "FF-" in p.stdout, p.stdout[:120])

    print("\n-- add / set / note / queue round-trip")
    p = run_cli("add", "--title", "self-test ticket", "--source", "agent",
                "--priority", "2", sandbox=sandbox)
    check("add exits 0", p.returncode == 0, p.stderr)
    m = re.search(r"\b(FF-\d{4,})\b", p.stdout)
    tid = m.group(1) if m else None
    check("add prints a new FF id", tid is not None, p.stdout.strip())

    if tid:
        check("set in-progress",
              run_cli("set", "--id", tid, "--status", "in-progress", sandbox=sandbox).returncode == 0)
        p = run_cli("queue", "add", tid, sandbox=sandbox)
        check("queue add", p.returncode == 0, p.stderr)
        check("queue contains it", tid in run_cli("queue", "list", sandbox=sandbox).stdout)
        check("queue remove", run_cli("queue", "remove", "--id", tid, sandbox=sandbox).returncode == 0)
        check("queue no longer contains it",
              tid not in run_cli("queue", "list", sandbox=sandbox).stdout)
        p = run_cli("note", "--id", tid, "--append-text", "self-test note", sandbox=sandbox)
        check("note append", p.returncode == 0, p.stderr)
        check("set done", run_cli("set", "--id", tid, "--status", "done", sandbox=sandbox).returncode == 0)

        data = yaml.safe_load(sandbox.read_text())
        item = next((i for i in data["intake"] if i.get("id") == tid), None)
        check("new task persisted with done status",
              item is not None and item.get("status") == "done", str(item and item.get("status")))
        check("note persisted", item is not None and "self-test note" in (item.get("notes") or ""))
        check("completed_at set when done", item is not None and item.get("completed_at"))
        check("meta.updated_at bumped", (data.get("meta") or {}).get("updated_at") is not None)

        check("set back to open clears completed_at",
              run_cli("set", "--id", tid, "--status", "open", sandbox=sandbox).returncode == 0)
        data = yaml.safe_load(sandbox.read_text())
        item = next((i for i in data["intake"] if i.get("id") == tid), None)
        check("completed_at cleared", item is not None and item.get("completed_at") is None)

    print("\n-- queue_top skips blocked tickets")
    if tid:
        # Put the ticket at the head of the queue, block it, and prove `next`
        # does not stall on it (a blocked ticket waits on the owner).
        run_cli("queue", "add", "--at", "head", tid, sandbox=sandbox)
        run_cli("set", "--id", tid, "--status", "blocked", sandbox=sandbox)
        p = run_cli("next", sandbox=sandbox)
        check("blocked head is skipped by next", tid not in p.stdout, p.stdout.strip())
        run_cli("set", "--id", tid, "--status", "open", sandbox=sandbox)
        p = run_cli("next", sandbox=sandbox)
        check("open ticket at head is returned again", tid in p.stdout, p.stdout.strip())
        run_cli("queue", "remove", tid, sandbox=sandbox)

    print("\n-- error paths")
    p = run_cli("set", "--id", "FF-9999", "--status", "done", sandbox=sandbox)
    check("unknown id rejected", p.returncode == 1 and "not found" in p.stderr.lower(),
          "rc=%s %s" % (p.returncode, p.stderr.strip()[:120]))
    p = run_cli("add", "--title", "bad", "--priority", "9", sandbox=sandbox)
    check("bad priority rejected", p.returncode != 0 and "priority" in p.stderr.lower(),
          "rc=%s %s" % (p.returncode, p.stderr.strip()[:120]))

    print("\n-- isolation")
    check("live TASKS.yaml untouched", sha(LIVE) == live_before)
    p = subprocess.run([sys.executable, "-W", "error", str(CLI), "next"],
                       capture_output=True, text=True, timeout=60)
    check("CLI is warning-free under -W error", p.returncode == 0, p.stderr[:200])

    shutil.rmtree(tmp, ignore_errors=True)
    print("\n%d passed, %d failed" % (len(PASSED), len(FAILED)))
    if FAILED:
        for name, detail in FAILED:
            print("  - %s %s" % (name, detail))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
