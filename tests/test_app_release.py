"""Tests for the AweFit release metadata endpoint (FF-0009)."""

import json

import pytest

from app import create_app, db


@pytest.fixture
def release_app(tmp_path):
    app = create_app('testing')
    app.config['APP_RELEASE_DIR'] = str(tmp_path)
    with app.app_context():
        db.create_all()
        yield app


@pytest.fixture
def client(release_app):
    return release_app.test_client()


def _write(dir_path, payload):
    (dir_path / 'version.json').write_text(
        payload if isinstance(payload, str) else json.dumps(payload)
    )


def test_no_published_build_returns_404(client):
    response = client.get('/api/app/version')
    assert response.status_code == 404
    assert response.get_json()['error']


def test_published_build_is_served(client, tmp_path):
    _write(tmp_path, {
        'appId': 'dev.awefit.app',
        'versionCode': 7,
        'versionName': '0.1.6',
        'downloadPath': '/download/awefit.apk',
    })

    response = client.get('/api/app/version')

    assert response.status_code == 200
    body = response.get_json()
    assert body['versionCode'] == 7
    assert body['versionName'] == '0.1.6'
    assert body['downloadPath'] == '/download/awefit.apk'


def test_update_check_is_never_cached(client, tmp_path):
    _write(tmp_path, {'versionCode': 1, 'versionName': '0.0.1'})

    response = client.get('/api/app/version')

    assert response.headers['Cache-Control'] == 'no-store'


def test_malformed_json_is_a_500_not_a_crash(client, tmp_path):
    _write(tmp_path, '{ this is not json')

    response = client.get('/api/app/version')

    assert response.status_code == 500
    assert response.get_json()['error']


def test_metadata_without_version_code_is_rejected(client, tmp_path):
    _write(tmp_path, {'versionName': '0.0.1'})

    response = client.get('/api/app/version')

    assert response.status_code == 500


def test_published_apk_is_downloadable(client, tmp_path):
    (tmp_path / 'awefit.apk').write_bytes(b'PK\x03\x04 not really a zip')
    _write(tmp_path, {'versionCode': 2, 'downloadPath': '/download/awefit.apk'})

    response = client.get('/download/awefit.apk')

    assert response.status_code == 200
    assert response.data.startswith(b'PK')
    # as_attachment so a browser saves it instead of rendering it
    assert 'attachment' in response.headers.get('Content-Disposition', '')


def test_download_route_rejects_path_traversal(client, tmp_path):
    (tmp_path / 'awefit.apk').write_bytes(b'x')

    response = client.get('/download/../.env')

    assert response.status_code in (400, 404)
    assert b'SECRET_KEY' not in response.data


def test_download_route_only_serves_release_files(client, tmp_path):
    (tmp_path / 'notes.txt').write_text('not a release artifact')

    response = client.get('/download/notes.txt')

    assert response.status_code == 404


def test_missing_apk_is_404(client):
    response = client.get('/download/awefit.apk')
    assert response.status_code == 404
