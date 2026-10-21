import io
import json
from pathlib import Path
from unittest.mock import patch

import pytest
from PIL import Image

from app import db
from app.models.exercise_log import ExerciseLog
from app.models.user import User
from app.models.weight_log import WeightLog

DATA = {'activity_id': 'treadmill_walking', 'date': '2026-10-21',
        'duration_minutes': 30, 'speed': 2.5}


def photo():
    raw = io.BytesIO()
    Image.new('RGB', (5, 5)).save(raw, 'PNG')
    raw.seek(0)
    return raw, 'test.png'


def test_foreign_log_photo_is_hidden_and_never_writes(authenticated_client, app):
    user = User(username='other-photo', email='other-photo@example.com', password_hash='unused')
    db.session.add(user)
    db.session.flush()
    log = ExerciseLog(user_id=user.id, exercise_name='Private', duration=5)
    db.session.add(log)
    db.session.commit()
    endpoint = f'/api/exercise/log/{log.id}/photo'
    assert authenticated_client.get(endpoint).status_code == 404
    assert authenticated_client.delete(endpoint).status_code == 404
    assert authenticated_client.post(endpoint, data={'photo': photo()}).status_code == 404
    assert list(Path(app.config['UPLOAD_FOLDER']).rglob('*.jpg')) == []


def test_shared_photo_survives_until_final_reference_removed(authenticated_client, test_user, app):
    result = authenticated_client.post('/api/exercise/log', data={'data': json.dumps(DATA), 'photo': photo()}).json
    path = Path(app.config['UPLOAD_FOLDER']) / result['photo_url']
    other_log = WeightLog(user_id=test_user.id, weight=200, photo_url=result['photo_url'])
    db.session.add(other_log)
    db.session.commit()
    assert authenticated_client.delete(f"/api/exercise/{result['id']}").status_code == 200
    assert path.exists()
    other_log.photo_url = None
    db.session.commit()
    from app.utils.uploads import remove_if_unreferenced
    assert remove_if_unreferenced(result['photo_url'])
    assert not path.exists()


def test_failed_replace_preserves_original_file_and_reference(authenticated_client, app):
    body = authenticated_client.post('/api/exercise/log', data={'data': json.dumps(DATA), 'photo': photo()}).json
    path = Path(app.config['UPLOAD_FOLDER']) / body['photo_url']
    with patch.object(db.session, 'commit', side_effect=RuntimeError('db failure')):
        with pytest.raises(RuntimeError):
            authenticated_client.post(body['photo_endpoint'], data={'photo': photo()})
    assert path.exists()
    assert len(list(Path(app.config['UPLOAD_FOLDER']).rglob('*.jpg'))) == 1
    assert db.session.get(ExerciseLog, body['id']).photo_url == body['photo_url']


def test_missing_file_is_not_server_error(authenticated_client, test_user):
    log = ExerciseLog(user_id=test_user.id, exercise_name='Old photo', duration=5,
                      photo_url='exercise_photos/missing.jpg')
    db.session.add(log)
    db.session.commit()
    assert authenticated_client.get(f'/api/exercise/log/{log.id}/photo').status_code == 404


def test_atomic_edit_changes_photo_and_fields_together(authenticated_client, app):
    body = authenticated_client.post('/api/exercise/log', data={'data': json.dumps(DATA), 'photo': photo()}).json
    original = Path(app.config['UPLOAD_FOLDER']) / body['photo_url']
    result = authenticated_client.put(f"/api/exercise/log/{body['id']}", data={
        'data': json.dumps({**DATA, 'duration_minutes': 60}), 'photo': photo()})
    assert result.status_code == 200
    assert result.json['duration_min'] == 60
    assert not original.exists()
    assert result.json['photo_url'] != body['photo_url']


@pytest.mark.parametrize('payload', ['not-json', '[]', '{}'])
def test_invalid_multipart_does_not_stage_uploads(authenticated_client, app, payload):
    result = authenticated_client.post('/api/exercise/log', data={'data': payload, 'photo': photo()})
    assert result.status_code == 400
    assert not list(Path(app.config['UPLOAD_FOLDER']).rglob('*.jpg'))
