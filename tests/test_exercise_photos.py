import io
import json
from pathlib import Path
from unittest.mock import patch

from PIL import Image
import pytest

from app import db
from app.models.exercise_log import ExerciseLog

DATA = {'activity_id': 'treadmill_walking', 'date': '2026-10-21',
        'duration_minutes': 30, 'speed': 2.5, 'incline_percent': 0}


def photo():
    output = io.BytesIO()
    Image.new('RGB', (10, 10), 'red').save(output, format='PNG')
    output.seek(0)
    return output, 'photo.png'


def create(client):
    return client.post('/api/exercise/log', data={'data': json.dumps(DATA), 'photo': photo()})


def test_initial_photo_replace_view_remove(authenticated_client, app):
    client = authenticated_client
    response = create(client)
    assert response.status_code == 201
    body = response.json
    original = Path(app.config['UPLOAD_FOLDER']) / body['photo_url']
    assert original.exists()
    assert client.get(body['photo_endpoint']).mimetype == 'image/jpeg'
    replacement = client.post(body['photo_endpoint'], data={'photo': photo()})
    assert replacement.status_code == 200
    assert not original.exists()
    path = Path(app.config['UPLOAD_FOLDER']) / replacement.json['photo_url']
    assert path.exists()
    assert client.delete(body['photo_endpoint']).json['photo_url'] is None
    assert not path.exists()


def test_bad_photo_or_bad_session_leaves_no_files(authenticated_client, app):
    response = authenticated_client.post('/api/exercise/log', data={
        'data': json.dumps(DATA), 'photo': (io.BytesIO(b'not image'), 'bad.jpg')})
    assert response.status_code == 400
    assert ExerciseLog.query.count() == 0
    response = authenticated_client.post('/api/exercise/log', data={
        'data': json.dumps({**DATA, 'speed': -1}), 'photo': photo()})
    assert response.status_code == 400
    assert not list(Path(app.config['UPLOAD_FOLDER']).rglob('*.jpg'))


def test_photo_removal_is_atomic_with_session_edit(authenticated_client, app):
    body = create(authenticated_client).json
    path = Path(app.config['UPLOAD_FOLDER']) / body['photo_url']
    endpoint = f"/api/exercise/log/{body['id']}"
    invalid = authenticated_client.put(endpoint, json={**DATA, 'duration_minutes': -1, 'remove_photo': True})
    assert invalid.status_code == 400
    assert path.exists()
    result = authenticated_client.put(endpoint, json={**DATA, 'duration_minutes': 40, 'remove_photo': True})
    assert result.status_code == 200
    assert result.json['photo_url'] is None
    assert result.json['duration_min'] == 40
    assert not path.exists()


@pytest.mark.parametrize('value', ['true', 1, None])
def test_remove_flag_must_be_boolean(authenticated_client, value):
    assert authenticated_client.post('/api/exercise/log', json={**DATA, 'remove_photo': value}).status_code == 400


def test_commit_failure_removes_new_file(authenticated_client, app):
    with patch.object(db.session, 'commit', side_effect=RuntimeError('database failure')):
        with pytest.raises(RuntimeError):
            create(authenticated_client)
    assert not list(Path(app.config['UPLOAD_FOLDER']).rglob('*.jpg'))
    assert ExerciseLog.query.count() == 0
