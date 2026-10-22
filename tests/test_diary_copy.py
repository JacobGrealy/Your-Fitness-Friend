from datetime import datetime
from uuid import uuid4
from unittest.mock import patch

import pytest
from app import db
from app.models.diary_copy_operation import DiaryCopyOperation
from app.models.exercise_log import ExerciseLog
from app.models.health_log import HealthLog
from app.models.user import User
from app.models.weight_log import WeightLog

SOURCE = '2026-10-21'
DEST = '2026-10-22'


def request_for(ids, **changes):
    return {'source_date': SOURCE, 'destination_date': DEST, 'log_ids': ids,
            'confirmed': True, 'request_id': str(uuid4()), **changes}


@pytest.mark.parametrize('kind,dose', [('medication', 9), ('bowel', None)])
def test_health_copy_preserves_time_dose_notes_and_original(authenticated_client, kind, dose):
    c = authenticated_client
    source = c.post('/api/health/logs', json={'kind': kind, 'logged_at': SOURCE + 'T08:45', 'dose_mg': dose, 'notes': 'Recorded event'}).json
    response = c.post('/api/health/copy', json=request_for([source['id']], kind=kind))
    assert response.status_code == 201, response.json
    result = response.json
    copied = c.get(f"/api/health/logs/{result['created_ids'][0]}").json
    assert copied['logged_at'] == DEST + 'T08:45'
    assert copied['dose_mg'] == dose
    assert copied['notes'] == source['notes']
    assert c.get(f"/api/health/logs/{source['id']}").json == source
    assert len(c.get('/api/health/logs?date=' + DEST).json) == 1


EXERCISES = [
    {'activity_id': 'treadmill_walking', 'speed': 1.4, 'incline_percent': 9, 'arms_supported': True},
    {'activity_id': 'strength_training', 'exercises': [{'name': 'Custom dumbbell lift', 'equipment': 'dumbbell', 'sets': [{'reps': 10, 'weight_lbs': 20}]}]},
    {'activity_id': 'outdoor_walking', 'distance': 1.5},
    {'activity_id': 'outdoor_running', 'pace': 10},
    {'activity_id': 'treadmill_running', 'speed': 6, 'incline_percent': 3},
    {'activity_id': 'cycling', 'distance': 6},
    {'activity_id': 'stationary_cycling', 'power_watts': 100, 'distance': 5},
    {'activity_id': 'stretching'},
    {'activity_id': 'yoga', 'yoga_style': 'vinyasa'},
]


@pytest.mark.parametrize('activity', EXERCISES)
def test_typed_exercise_copy_uses_destination_weight_without_photo(authenticated_client, test_user, activity):
    db.session.add_all([
        WeightLog(user_id=test_user.id, weight=200, recorded_at=datetime(2026, 10, 21)),
        WeightLog(user_id=test_user.id, weight=180, recorded_at=datetime(2026, 10, 22)),
    ])
    db.session.commit()
    c = authenticated_client
    source = c.post('/api/exercise/log', json={**activity, 'date': SOURCE, 'duration_minutes': 30, 'notes': 'Original session'}).json
    row = db.session.get(ExerciseLog, source['id'])
    row.photo_url = 'exercise_photos/source.jpg'
    db.session.commit()
    result = c.post('/api/exercise/copy', json=request_for([source['id']]))
    assert result.status_code == 201, result.json
    assert result.json['photos_copied'] is False
    assert result.json['recalculated_exercises'] == 1
    copied = c.get(f"/api/exercise/log/{result.json['created_ids'][0]}").json
    assert copied['photo_url'] is None
    assert copied['date'] == DEST
    assert copied['details']['weight_lbs'] == 180
    assert copied['calories_burned'] == pytest.approx(source['calories_burned'] * 0.9)
    assert copied['notes'] == 'Original session'
    assert db.session.get(ExerciseLog, source['id']).photo_url == 'exercise_photos/source.jpg'
    if activity['activity_id'] == 'strength_training':
        assert copied['details']['exercises'] == source['details']['exercises']


def test_manual_override_not_double_adjusted_and_legacy_disclosed(authenticated_client, test_user):
    c = authenticated_client
    source = c.post('/api/exercise/log', json={**EXERCISES[0], 'date': SOURCE, 'duration_minutes': 30, 'calorie_override': 400}).json
    legacy = ExerciseLog(user_id=test_user.id, exercise_name='Old walk', duration=10, calories_burned=50, logged_at=datetime(2026, 10, 21), photo_url='weight_photos/old.jpg')
    db.session.add(legacy)
    db.session.commit()
    result = c.post('/api/exercise/copy', json=request_for([source['id'], legacy.id])).json
    copied = [db.session.get(ExerciseLog, i) for i in result['created_ids']]
    assert copied[0].calories_burned == 300
    assert copied[0].details['calorie_override'] == 400
    assert copied[1].calories_burned == 50
    assert all(log.photo_url is None for log in copied)
    assert result['legacy_estimates_preserved'] == 1
    assert result['warnings']


def test_retry_idempotency_and_conflicting_reuse(authenticated_client):
    c = authenticated_client
    source = c.post('/api/health/logs', json={'kind': 'medication', 'dose_mg': 4, 'logged_at': SOURCE + 'T08:00'}).json
    payload = request_for([source['id']], kind='medication')
    first = c.post('/api/health/copy', json=payload)
    second = c.post('/api/health/copy', json=payload)
    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json['replayed'] is True
    assert second.json['created_ids'] == first.json['created_ids']
    assert HealthLog.query.count() == 2
    assert DiaryCopyOperation.query.count() == 1
    assert c.post('/api/health/copy', json={**payload, 'destination_date': '2026-10-23'}).status_code == 409
    assert HealthLog.query.count() == 2


@pytest.mark.parametrize('change', [
    {'confirmed': False}, {'confirmed': 'true'}, {'log_ids': []}, {'log_ids': [True]},
    {'log_ids': [1, 1]}, {'request_id': 'bad'}, {'source_date': '20261021'},
    {'destination_date': SOURCE}, {'destination_date': '2026-02-30'},
])
def test_invalid_copy_inputs_do_not_write(authenticated_client, change):
    response = authenticated_client.post('/api/exercise/copy', json=request_for([1], **change))
    assert response.status_code == 400
    assert ExerciseLog.query.count() == 0
    assert DiaryCopyOperation.query.count() == 0


def test_missing_foreign_wrong_day_and_wrong_kind_are_hidden(authenticated_client):
    other = User(username='copy-other', email='copy-other@example.com', password_hash='unused')
    db.session.add(other)
    db.session.flush()
    log = HealthLog(user_id=other.id, kind='medication', dose_mg=25, logged_at=datetime(2026, 10, 21, 8))
    db.session.add(log)
    db.session.commit()
    c = authenticated_client
    assert c.post('/api/health/copy', json=request_for([log.id], kind='medication')).status_code == 404
    own = c.post('/api/health/logs', json={'kind': 'medication', 'dose_mg': 4, 'logged_at': SOURCE + 'T08:00'}).json
    assert c.post('/api/health/copy', json=request_for([own['id']], kind='bowel')).status_code == 404
    assert c.post('/api/health/copy', json=request_for([own['id']], kind='medication', source_date=DEST, destination_date=SOURCE)).status_code == 404
    assert DiaryCopyOperation.query.count() == 0


def test_all_or_none_on_invalid_exercise_inputs(authenticated_client, test_user):
    c = authenticated_client
    source = c.post('/api/exercise/log', json={'activity_id': 'stretching', 'date': SOURCE, 'duration_minutes': 10}).json
    broken = ExerciseLog(user_id=test_user.id, exercise_name='Broken typed row', activity_id='treadmill_walking', logged_at=datetime(2026, 10, 21), details={'method': 'old'})
    db.session.add(broken)
    db.session.commit()
    response = c.post('/api/exercise/copy', json=request_for([source['id'], broken.id]))
    assert response.status_code == 400
    assert ExerciseLog.query.count() == 2
    assert DiaryCopyOperation.query.count() == 0


def test_commit_failure_rolls_back_all_copy_rows(authenticated_client):
    c = authenticated_client
    source = c.post('/api/health/logs', json={'kind': 'bowel', 'logged_at': SOURCE + 'T08:00'}).json
    with patch.object(db.session, 'commit', side_effect=RuntimeError('commit failed')):
        with pytest.raises(RuntimeError):
            c.post('/api/health/copy', json=request_for([source['id']], kind='bowel'))
    assert HealthLog.query.count() == 1
    assert DiaryCopyOperation.query.count() == 0


def test_copy_endpoints_require_authentication(client):
    for endpoint in ('/api/health/copy', '/api/exercise/copy'):
        assert client.post(endpoint, json={}).status_code == 401
