"""One place that knows where uploaded files live (FF-0079).

Uploads were resolved two different ways: `app/config.py` defines `UPLOAD_FOLDER`, and
two modules honoured it, while five others hard-coded `current_app.root_path/uploads`.
Every verification run against a copied database therefore still wrote into the real
`app/uploads/` — a photo directory nobody can safely reason about afterwards, and one
whose `ai_food_logs/` half was swept by a cleanup that could never have been tested.

`UPLOAD_FOLDER` is now environment-driven, so a throwaway server can point uploads at a
temp directory next to its database copy. Prod leaves it unset and gets `app/uploads`.
"""

import os

from flask import current_app


def uploads_root():
    """Absolute path to the uploads root for the running app.

    Reads `UPLOAD_FOLDER` from config, which is itself environment-driven, and falls
    back to `<app>/uploads` so nothing changes for an unset environment.
    """
    configured = current_app.config.get('UPLOAD_FOLDER')
    if configured:
        return os.path.abspath(configured)
    return os.path.abspath(os.path.join(current_app.root_path, 'uploads'))


def upload_dir(kind):
    """Absolute path to one upload subdirectory, created if missing."""
    path = os.path.join(uploads_root(), kind)
    os.makedirs(path, exist_ok=True)
    return path


def stored_file_path(stored):
    """Absolute path for a stored reference such as `meal_photos/x.jpg`.

    Rejects anything that would escape the uploads root, so a crafted reference cannot
    read outside it.
    """
    root = uploads_root()
    candidate = os.path.abspath(os.path.join(root, stored))
    if candidate != root and not candidate.startswith(root + os.sep):
        raise ValueError('path escapes the uploads directory')
    return candidate


#: Every column that can point at a stored file. A file is only deletable when nothing
#: else references it, because photos are shared between rows (FF-0102).
_REFERENCE_COLUMNS = (
    ('food_logs', 'photo_url'),
    ('foods', 'photo_url'),
    ('meal_photos', 'photo_path'),
    ('users', 'profile_photo_path'),
    ('weight_logs', 'photo_url'),
)


_existing_columns = None


def _referenceable_columns():
    """The reference columns that actually exist in this database.

    Inspected rather than assumed: a missing column must not raise (and must certainly not
    roll back the caller's pending transaction), and older deployments may lack one.
    """
    global _existing_columns
    if _existing_columns is None:
        from sqlalchemy import inspect
        from app import db

        available = []
        inspector = inspect(db.engine)
        names = set(inspector.get_table_names())
        for table, column in _REFERENCE_COLUMNS:
            if table not in names:
                continue
            if column in {col['name'] for col in inspector.get_columns(table)}:
                available.append((table, column))
        _existing_columns = tuple(available)
    return _existing_columns


def references_to(stored, exclude=None):
    """Count the rows that still point at `stored`.

    `exclude` is a (table, row_id) pair for the row being changed, so its own reference is
    not mistaken for another owner's.
    """
    from sqlalchemy import text
    from app import db

    total = 0
    for table, column in _referenceable_columns():
        clause = f'SELECT COUNT(*) FROM {table} WHERE {column} = :stored'
        params = {'stored': stored}
        if exclude and exclude[0] == table:
            clause += ' AND id != :row_id'
            params['row_id'] = exclude[1]
        total += int(db.session.execute(text(clause), params).scalar() or 0)
    return total


def remove_if_unreferenced(stored, exclude=None):
    """Delete a stored file only when no other row points at it.

    Returns True when the file was removed. A shared photo survives while any log (or
    food, meal, avatar) still shows it, which is what makes sharing safe: deleting one
    entry's photo must not blank another's.
    """
    if not stored:
        return False
    if references_to(stored, exclude=exclude) > 0:
        return False
    try:
        os.remove(stored_file_path(stored))
        return True
    except (OSError, ValueError):
        return False
