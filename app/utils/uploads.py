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
