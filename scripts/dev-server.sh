#!/usr/bin/env bash
#
# Start a throwaway server for verification (FF-0079).
#
# It copies the live database and points uploads at a directory of its own, so browser
# checks can upload, delete and browse photos without touching production data or the
# real `app/uploads/` tree. Verification used to copy the database by hand and then write
# into prod uploads anyway, which left stray photos in a directory nobody could audit.
#
#   ./scripts/dev-server.sh                 # random free port, cleaned up on exit
#   ./scripts/dev-server.sh --port 5191     # pin the port
#   ./scripts/dev-server.sh --keep          # keep the work directory afterwards
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=""
KEEP=0

usage() {
  sed -n '2,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="${2:-}"; shift 2 ;;
    --keep) KEEP=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ ! -f "$ROOT/instance/fitness_friend.db" ]; then
  echo "no live database at instance/fitness_friend.db" >&2
  exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/awefit-dev.XXXXXX")"
DB="$WORK/dev.db"
UPLOADS="$WORK/uploads"

cp "$ROOT/instance/fitness_friend.db" "$DB"
mkdir -p "$UPLOADS"

if [ -z "$PORT" ]; then
  # Ask the OS for a free port rather than guessing one. (Port 5181 is the ticket board.)
  PORT="$("$ROOT/venv/bin/python" -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
fi

cleanup() {
  local status=$?
  if [ "$KEEP" -eq 1 ]; then
    echo
    echo "kept: $WORK"
  else
    rm -rf "$WORK"
  fi
  return $status
}
trap cleanup EXIT INT TERM

export DATABASE_URL="sqlite:///$DB"
export UPLOAD_FOLDER="$UPLOADS"
export SECRET_KEY="${SECRET_KEY:-dev-server-only-not-a-secret}"
export FLASK_CONFIG="${FLASK_CONFIG:-production}"

cat <<EOF
throwaway server (production app, isolated data)
  url      : http://127.0.0.1:$PORT
  database : $DB
  uploads  : $UPLOADS   <- photos written here, never app/uploads
  stop     : Ctrl-C
EOF

# Foreground, so the trap runs and the temp tree is removed when it exits.
"$ROOT/venv/bin/gunicorn" \
  --bind "127.0.0.1:$PORT" \
  --workers 1 \
  --threads 2 \
  --access-logfile - \
  --error-logfile - \
  "app:create_app()"
