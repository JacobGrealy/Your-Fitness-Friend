#!/bin/bash

# FitnessFriend local backup
#
# Snapshots the two things that cannot be rebuilt from the repo:
#   1. instance/fitness_friend.db  - via SQLite's online backup API, so a write
#      in flight cannot produce a torn copy, then integrity-checked
#   2. app/uploads/                - rsync hardlink snapshots; only changed
#      photos cost space
# plus .env, which holds SECRET_KEY and the model config, and the AweFit
# release keystore, which cannot be regenerated without orphaning every
# installed APK — so a restore is actually complete.
#
# Local only: this protects against mistakes, not disk failure. Copies live on
# the same filesystem, so mirror backups/ off the box periodically.
#
# Usage:  scripts/backup.sh
# Restore: see the "Backups" section of README.md

set -euo pipefail

# cron runs with a minimal PATH; be explicit rather than relying on the caller
export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

APP_DIR="/home/angrygiant/github_projects/FitnessFriend"
DB="$APP_DIR/instance/fitness_friend.db"
UPLOADS="$APP_DIR/app/uploads"
ENV_FILE="$APP_DIR/.env"
# AweFit signing key — outside the repo on purpose (see frontend/android/.gitignore)
KEYSTORE_DIR="$HOME/.android-keys"
KEYSTORE_PROPS="$APP_DIR/frontend/android/keystore.properties"
BACKUP_ROOT="$APP_DIR/backups"
PYTHON="$APP_DIR/venv/bin/python"
KEEP="${KEEP:-14}"

STAMP="$(date +%Y%m%d-%H%M%S)"
DB_DIR="$BACKUP_ROOT/db"
ENV_DIR="$BACKUP_ROOT/env"
KEYS_DIR="$BACKUP_ROOT/keys"
UPLOADS_DIR="$BACKUP_ROOT/uploads"

if [ ! -f "$DB" ]; then
    echo "ERROR: database not found at $DB" >&2
    exit 1
fi

mkdir -p "$DB_DIR" "$ENV_DIR" "$UPLOADS_DIR"

# Only one run at a time; a second cron overlap should not fight for the lock
exec 9>"$BACKUP_ROOT/.lock"
if ! flock -n 9; then
    echo "Another backup is already running; exiting." >&2
    exit 1
fi

# 1. Database ---------------------------------------------------------------
# sqlite3 CLI is not installed here, so use the stdlib backup API.
"$PYTHON" - "$DB" "$DB_DIR/fitness_friend-$STAMP.db.gz" <<'PY'
import gzip, os, shutil, sqlite3, sys, tempfile

source_path, dest_path = sys.argv[1], sys.argv[2]

with tempfile.TemporaryDirectory() as tmpdir:
    staged = os.path.join(tmpdir, 'snapshot.db')

    source = sqlite3.connect(source_path)
    target = sqlite3.connect(staged)
    try:
        source.backup(target)
    finally:
        target.close()
        source.close()

    check = sqlite3.connect(f'file:{staged}?mode=ro', uri=True)
    try:
        result = check.execute('PRAGMA integrity_check').fetchone()[0]
        tables = check.execute(
            "select count(*) from sqlite_master where type='table'"
        ).fetchone()[0]
    finally:
        check.close()

    if result != 'ok':
        raise SystemExit(f'integrity_check failed on the snapshot: {result}')

    with open(staged, 'rb') as f_in, gzip.open(dest_path, 'wb') as f_out:
        shutil.copyfileobj(f_in, f_out)

print(f'  database   : {os.path.getsize(dest_path)} bytes gzipped, '
      f'integrity ok, {tables} tables')
PY

# 2. Uploads ---------------------------------------------------------------
# --link-dest hardlinks unchanged files to the previous snapshot, so a 92 MB
# photo tree costs only the delta each run.
LATEST="$UPLOADS_DIR/latest"
DEST="$UPLOADS_DIR/$STAMP"
if [ -d "$LATEST" ]; then
    rsync -a --delete --link-dest="$LATEST/" "$UPLOADS/" "$DEST/"
else
    rsync -a "$UPLOADS/" "$DEST/"
fi
rm -f "$LATEST"
ln -s "$STAMP" "$LATEST"
echo "  uploads    : $(du -sh "$DEST" | cut -f1) (hardlinked snapshot $STAMP)"

# 3. .env ------------------------------------------------------------------
if [ -f "$ENV_FILE" ]; then
    install -m 600 "$ENV_FILE" "$ENV_DIR/.env"
    echo "  .env       : copied (mode 600)"
fi

# 3b. AweFit release keystore ----------------------------------------------
# Not rebuildable and not in the repo: lose it and no APK can ever be installed
# over the one on the phone again (Android treats a new key as a different app).
# The alias password lives in the keystore, and the properties file points at it.
if [ -d "$KEYSTORE_DIR" ]; then
    install -d -m 700 "$KEYS_DIR"
    rsync -a --delete "$KEYSTORE_DIR"/ "$KEYS_DIR"/
    chmod -R go-rwx "$KEYS_DIR"
    if [ -f "$KEYSTORE_PROPS" ]; then
        install -m 600 "$KEYSTORE_PROPS" "$KEYS_DIR/keystore.properties"
    fi
    echo "  keystore   : $(du -sh "$KEYS_DIR" | cut -f1) (mode 700)"
else
    echo "  keystore   : not present (skipped)"
fi

# 4. Retention -------------------------------------------------------------
prune() {
    local dir="$1" pattern="$2" keep="$3"
    # shellcheck disable=SC2012
    ls -1d "$dir"/$pattern 2>/dev/null | sort -r | tail -n +$((keep + 1)) | while read -r old; do
        rm -rf "$old"
        echo "  pruned     : $(basename "$old")"
    done
}

prune "$DB_DIR" 'fitness_friend-*.db.gz' "$KEEP"
prune "$UPLOADS_DIR" '[0-9]*-[0-9]*' "$KEEP"

echo "Backup complete: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  location   : $BACKUP_ROOT"
echo "  keeping    : last $KEEP database snapshots and upload snapshots"
