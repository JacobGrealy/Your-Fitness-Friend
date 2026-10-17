#!/usr/bin/env bash
# gates.sh — the single pass/fail command an autonomous round must satisfy.
#
#   ./scripts/gates.sh              # everything (pytest, jest, tsc, live smoke)
#   ./scripts/gates.sh backend      # pytest only
#   ./scripts/gates.sh frontend     # jest + tsc
#   ./scripts/gates.sh smoke        # boot a throwaway server and curl it
#
# Exit 0 only when every selected gate passed. The smoke gate never touches the
# live database, the live uploads tree, or the running service: it copies the
# database to a temp dir, points DATABASE_URL at the copy, binds a free port and
# kills the server afterwards. That is what makes it safe for an unattended
# round to run between real deploys.

set -uo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT" || exit 1

# systemd and cron both run with a minimal PATH; the node toolchain lives in nvm
export PATH="/home/angrygiant/.nvm/versions/node/v22.22.2/bin:$PATH"

FAILED=()
PASSED=()

run_gate() {
    local name=$1
    shift
    printf '\n=== %s ===\n' "$name"
    if "$@"; then
        PASSED+=("$name")
        printf '=== %s: PASS ===\n' "$name"
    else
        FAILED+=("$name")
        printf '=== %s: FAIL ===\n' "$name"
    fi
}

gate_backend() {
    ./venv/bin/python -m pytest tests/ -q
}

gate_jest() {
    ( cd frontend && npm test --silent )
}

gate_tsc() {
    ( cd frontend && npx tsc --noEmit )
}

gate_tooling() {
    # The ticket CLI has to stay trustworthy: it is how an unattended round
    # knows what to do next. Needs PyYAML, which the system python3 has and the
    # app venv deliberately does not (the Flask app never imports it).
    if ! python3 -c 'import yaml' 2>/dev/null; then
        echo "skipped: system python3 has no PyYAML"
        return 0
    fi
    python3 tasks/scripts/test_tasks.py
}

gate_smoke() {
    local tmp port pid rc=0
    tmp=$(mktemp -d "${TMPDIR:-/tmp}/ff-gates.XXXXXX") || return 1
    port=$(./venv/bin/python -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')

    # Work on a copy: the smoke server must never open the live database.
    if [ -f instance/fitness_friend.db ]; then
        cp instance/fitness_friend.db "$tmp/smoke.db"
    else
        echo "note: no live database found, smoke starts from an empty one"
        : > "$tmp/smoke.db"
    fi

    FLASK_ENV=production \
    DATABASE_URL="sqlite:///$tmp/smoke.db" \
    SECRET_KEY="gates-smoke-not-a-secret" \
    ./venv/bin/gunicorn --bind "127.0.0.1:$port" --workers 1 --threads 1 \
        --timeout 60 --error-logfile "$tmp/gunicorn.log" \
        "app:create_app()" >/dev/null 2>&1 &
    pid=$!

    local up=0
    for _ in $(seq 1 40); do
        if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then up=1; break; fi
        sleep 0.25
    done
    if [ "$up" -ne 1 ]; then
        echo "server did not open port $port"
        sed -n '1,40p' "$tmp/gunicorn.log"
        kill "$pid" 2>/dev/null
        rm -rf "$tmp"
        return 1
    fi

    local base="http://127.0.0.1:$port"
    check() {
        local label=$1 url=$2 want=$3 body
        body=$(curl -sS -o "$tmp/body" -w '%{http_code}' --max-time 10 "$url")
        if [ "$body" = "$want" ]; then
            printf '  ok   %-42s %s\n' "$label" "$body"
        else
            printf '  FAIL %-42s got %s want %s\n' "$label" "$body" "$want"
            head -c 200 "$tmp/body"; echo
            rc=1
        fi
    }

    check "SPA shell /"                  "$base/"                    200
    check "API json 404 /api/nope"       "$base/api/nope"            404
    check "API auth 401 /api/auth/me"    "$base/api/auth/me"         401
    check "API auth 401 /api/dashboard/daily" "$base/api/dashboard/daily" 401
    grep -q '"error"' "$tmp/body" || { echo "  401 body is not JSON"; rc=1; }

    kill "$pid" 2>/dev/null
    wait "$pid" 2>/dev/null
    rm -rf "$tmp"
    return $rc
}

case "${1:-all}" in
    backend)  run_gate backend  gate_backend ;;
    frontend) run_gate jest gate_jest; run_gate tsc gate_tsc ;;
    smoke)    run_gate smoke   gate_smoke ;;
    tooling)  run_gate tooling gate_tooling ;;
    all)
        run_gate backend gate_backend
        run_gate jest    gate_jest
        run_gate tsc     gate_tsc
        run_gate smoke   gate_smoke
        run_gate tooling gate_tooling
        ;;
    *) echo "usage: $0 [all|backend|frontend|smoke|tooling]" >&2; exit 2 ;;
esac

printf '\n---------------------------------------------\n'
printf 'passed: %s\n' "${PASSED[*]:-none}"
if [ "${#FAILED[@]}" -gt 0 ]; then
    printf 'FAILED: %s\n' "${FAILED[*]}"
    exit 1
fi
printf 'GATES GREEN\n'
