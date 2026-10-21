"""Real HTTP contract regression tests for FF-0104 (no model calls)."""
from unittest.mock import patch

import pytest

from app import db
from app.models.exercise_log import ExerciseLog
from app.models.saved_exercise import SavedExercise
from app.models.user import User


@pytest.fixture(autouse=True)
def estimator():
    with patch('app.routes.exercise.qwen_client.estimate_exercise_calories', return_value={'calories': 100}):
        yield


def test_selected_exercise_resolves_and_retains_date(authenticated_client, test_user):
    exercise = SavedExercise(user_id=test_user.id, name='Walking pad')
    db.session.add(exercise)
    db.session.commit()
    response = authenticated_client.post('/api/exercise/log', json={
        'exercise_id': str(exercise.id), 'duration_minutes': 30,
        'exercise_name': 'Untrusted name', 'date': '2026-10-01',
    })
    assert response.status_code == 201
    body = response.get_json()
    assert body['exercise_name'] == 'Walking pad'
    assert body['saved_exercise_id'] == exercise.id
    assert body['logged_at'] == '2026-10-01T00:00:00'
    assert ExerciseLog.query.get(body['id']).saved_exercise_id == exercise.id


def test_legacy_contract_and_both_delete_paths(authenticated_client):
    for path in ('/api/exercise/{}', '/api/exercise/log/{}'):
        response = authenticated_client.post('/api/exercise/log', json={
            'exercise_description': 'Walk', 'duration_min': 20,
        })
        assert response.status_code == 201
        assert authenticated_client.delete(path.format(response.json['id'])).status_code == 200
    assert ExerciseLog.query.count() == 0


def test_foreign_selection_and_deletion_are_hidden(authenticated_client):
    other = User(username='other', email='other@example.com', password_hash='unused')
    db.session.add(other)
    db.session.flush()
    exercise = SavedExercise(user_id=other.id, name='Private')
    log = ExerciseLog(user_id=other.id, exercise_name='Private', duration=10)
    db.session.add_all([exercise, log])
    db.session.commit()
    response = authenticated_client.post('/api/exercise/log', json={
        'exercise_id': exercise.id, 'duration_minutes': 10,
    })
    assert response.status_code == 404
    assert authenticated_client.delete(f'/api/exercise/log/{log.id}').status_code == 404
    assert authenticated_client.get('/api/exercise/logs').json == []


@pytest.mark.parametrize('duration', [0, -1, 'NaN', 'Infinity', '-Infinity', True, [], {}])
def test_invalid_durations_never_write(authenticated_client, duration):
    response = authenticated_client.post('/api/exercise/log', json={
        'exercise_name': 'Walk', 'duration_minutes': duration,
    })
    assert response.status_code == 400
    assert ExerciseLog.query.count() == 0


@pytest.mark.parametrize('day', ['2026-02-30', '20261001', '2026-10-01T12:00:00', None, 1])
def test_invalid_dates_never_write(authenticated_client, day):
    response = authenticated_client.post('/api/exercise/log', json={
        'exercise_name': 'Walk', 'duration_minutes': 20, 'date': day,
    })
    assert response.status_code == 400
    assert ExerciseLog.query.count() == 0


def test_inclusive_date_filter_and_validation(authenticated_client, test_user):
    from datetime import datetime
    for day in (1, 2, 3):
        db.session.add(ExerciseLog(user_id=test_user.id, exercise_name=str(day),
                                   logged_at=datetime(2026, 10, day, 23, 59), duration=10))
    db.session.commit()
    response = authenticated_client.get('/api/exercise/logs?start_date=2026-10-02&end_date=2026-10-02')
    assert [log['exercise_name'] for log in response.json] == ['2']
    for query in ('start_date=invalid', 'start_date=2026-10-03&end_date=2026-10-01', 'end_date='):
        assert authenticated_client.get('/api/exercise/logs?' + query).status_code == 400
