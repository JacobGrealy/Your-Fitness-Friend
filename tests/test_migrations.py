"""A fresh database must be buildable from the migration files alone.

This project has broken three times in exactly this way: a model changed, a
migration never generated or never committed, and `flask db upgrade` on a fresh
checkout dying with "Can't locate revision" or producing a schema that does not
match the code. The live database always hid it, because it had already been
patched by hand.

The test runs the real CLI against a temp SQLite file — no fixtures, no
`db.create_all()`, nothing that could paper over a missing migration.
"""

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FLASK = str(REPO_ROOT / 'venv' / 'bin' / 'flask')

pytestmark = pytest.mark.skipif(
    not os.path.exists(FLASK), reason='project venv missing; cannot run the Flask CLI'
)


def _flask(args, db_path):
    env = dict(os.environ)
    env.update({
        'FLASK_APP': 'main.py',
        # NOT 'testing': TestingConfig hardcodes sqlite:///:memory:, so the
        # migration would run against a throwaway in-memory database and the
        # test would assert on an empty file. 'production' honours DATABASE_URL.
        'FLASK_CONFIG': 'production',
        # Absolute path: sqlite:/// + four slashes is an absolute file URI.
        'DATABASE_URL': 'sqlite:///%s' % db_path,
        'SECRET_KEY': 'migration-test',
    })
    env.pop('FLASK_ENV', None)
    return subprocess.run(
        [FLASK] + args,
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def fresh_db(tmp_path):
    return str(tmp_path / 'fresh.db')


def _tables(db_path):
    with sqlite3.connect(db_path) as conn:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
    return {row[0] for row in rows}


def test_upgrade_head_builds_the_whole_schema(fresh_db):
    result = _flask(['db', 'upgrade'], fresh_db)
    assert result.returncode == 0, result.stdout + result.stderr

    tables = _tables(fresh_db)
    expected = {
        'users',
        'weight_logs',
        'exercise_logs',
        'saved_exercises',
        'foods',
        'food_logs',
        'meal_photos',
        'alembic_version',
    }
    missing = expected - tables
    assert not missing, 'fresh upgrade head is missing tables: %s' % ', '.join(sorted(missing))


def test_fresh_database_matches_the_head_revision(fresh_db):
    heads = _flask(['db', 'heads'], fresh_db)
    assert heads.returncode == 0, heads.stdout + heads.stderr
    head_tokens = [line.split()[0] for line in heads.stdout.splitlines() if '(head)' in line]
    assert len(head_tokens) == 1, 'expected exactly one head, got %r' % (head_tokens,)
    head = head_tokens[0]

    upgrade = _flask(['db', 'upgrade'], fresh_db)
    assert upgrade.returncode == 0, upgrade.stdout + upgrade.stderr

    with sqlite3.connect(fresh_db) as conn:
        versions = [row[0] for row in conn.execute('SELECT version_num FROM alembic_version')]

    assert versions == [head], 'alembic_version %r does not match head %s' % (versions, head)


def test_every_model_table_is_created_by_migrations(fresh_db, monkeypatch):
    """A model added without a migration shows up here, not in production."""
    upgrade = _flask(['db', 'upgrade'], fresh_db)
    assert upgrade.returncode == 0, upgrade.stdout + upgrade.stderr

    # monkeypatch, not os.environ: a leaked DATABASE_URL here would point every
    # later test in the session at this temp file.
    monkeypatch.setenv('DATABASE_URL', 'sqlite:///%s' % fresh_db)

    # Import the app's metadata with the same config the CLI used, so this is the
    # same truth the routes run against.
    sys.path.insert(0, str(REPO_ROOT))
    from app import create_app, db
    from app import models  # noqa: F401  (registers every model on the metadata)

    app = create_app('production')
    with app.app_context():
        model_tables = set(db.metadata.tables.keys())

    missing = model_tables - _tables(fresh_db)
    assert not missing, 'models without a migration: %s' % ', '.join(sorted(missing))


def test_upgrade_is_idempotent(fresh_db):
    first = _flask(['db', 'upgrade'], fresh_db)
    assert first.returncode == 0, first.stdout + first.stderr

    second = _flask(['db', 'upgrade'], fresh_db)
    assert second.returncode == 0, second.stdout + second.stderr

    tables_after = _tables(fresh_db)
    assert 'users' in tables_after and 'alembic_version' in tables_after
