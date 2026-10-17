"""Published AweFit release metadata and the APK download.

`scripts/build-android.sh` publishes into `releases/` at the repo root, **not**
into `app/static/`, because `vite build` empties `app/static` on every web
build (`emptyOutDir`). A published APK that disappears the next time somebody
rebuilds the frontend is worse than no update check at all.

- `GET /api/app/version`   metadata for the in-app update check
- `GET /download/<file>`   the APK and that metadata file
"""

import json
import os

from flask import Blueprint, current_app, jsonify, send_from_directory

bp = Blueprint('app_release', __name__)
download_bp = Blueprint('app_download', __name__)

# Only these ever get served: the publisher writes nothing else, and a download
# route is not a place to be creative.
_ALLOWED_SUFFIXES = ('.apk', '.json')


def _release_dir():
    """Directory the build published into; overridable for tests."""
    configured = current_app.config.get('APP_RELEASE_DIR')
    if configured:
        return configured
    app_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(os.path.dirname(app_root), 'releases')


@bp.route('/version', methods=['GET'])
def app_version():
    """Return the metadata of the last published AweFit build.

    404 when nothing has been published (a fresh checkout, or before the first
    `scripts/build-android.sh` run) — the client treats that as "nothing to do".
    """
    path = os.path.join(_release_dir(), 'version.json')
    if not os.path.isfile(path):
        return jsonify({'error': 'No AweFit build published'}), 404

    try:
        with open(path, encoding='utf-8') as handle:
            data = json.load(handle)
    except (OSError, ValueError):
        current_app.logger.warning('AweFit version.json unreadable at %s', path)
        return jsonify({'error': 'Release metadata unreadable'}), 500

    if not isinstance(data, dict) or 'versionCode' not in data:
        current_app.logger.warning('AweFit version.json has no versionCode at %s', path)
        return jsonify({'error': 'Release metadata malformed'}), 500

    response = jsonify(data)
    # An update check that serves a cached answer is worse than none.
    response.headers['Cache-Control'] = 'no-store'
    return response


@download_bp.route('/download/<path:filename>', methods=['GET'])
def download(filename):
    """Serve a published build file.

    `send_from_directory` rejects traversal, and the suffix allowlist keeps this
    route to the two things the publisher actually writes.
    """
    if not filename.endswith(_ALLOWED_SUFFIXES):
        return jsonify({'error': 'Not found'}), 404

    directory = _release_dir()
    if not os.path.isfile(os.path.join(directory, filename)):
        return jsonify({'error': 'No such release file'}), 404

    response = send_from_directory(directory, filename, as_attachment=filename.endswith('.apk'))
    response.headers['Cache-Control'] = 'no-store'
    return response
