from copy import deepcopy
from unittest.mock import patch

import pytest
from app import db
from app.models.exercise_log import ExerciseLog
from app.models.saved_exercise import SavedExercise
from app.models.user import User

DATA = {'activity_id': 'strength_training', 'date': '2026-10-22', 'exercises': [
    {'exercise_id': 'builtin:bench_press', 'sets': [{'reps': 10, 'weight_lbs': 95}, {'reps': 8, 'weight_lbs': 105}]},
    {'exercise_id': 'builtin:biceps_curl', 'sets': [{'reps': 12, 'weight_lbs': 20}]},
    {'exercise_id': 'builtin:push_up', 'sets': [{'reps': 15}]},
]}


def test_multi_exercise_workout_persists_sets_conventions_and_order(authenticated_client):
    c = authenticated_client
    with patch('app.routes.exercise.qwen_client.estimate_exercise_calories', side_effect=AssertionError('No AI')):
        r = c.post('/api/exercise/log', json=DATA)
    assert r.status_code == 201
    body = r.json
    assert body['duration_min'] is None
    assert body['calories_burned'] is None
    exercises = body['details']['exercises']
    assert [x['name'] for x in exercises] == ['Bench Press', 'Biceps Curl', 'Push-up']
    assert exercises[0]['sets'][1] == {'reps': 8, 'weight_lbs': 105}
    assert exercises[0]['load_convention'] == 'including_bar'
    assert exercises[1]['load_convention'] == 'per_hand'
    assert exercises[2]['sets'][0]['weight_lbs'] is None
    assert c.get('/api/exercise/latest?activity_id=strength_training').json['id'] == body['id']
    assert c.get('/api/exercise/logs?start_date=2026-10-22&end_date=2026-10-22').json[0]['details']['exercises'] == exercises
    updated = c.put(f"/api/exercise/log/{body['id']}", json={**DATA, 'notes': 'Updated'})
    assert updated.status_code == 200
    assert updated.json['notes'] == 'Updated'
    assert c.delete(f"/api/exercise/{body['id']}").status_code == 200


def test_duration_effort_estimates_not_reps_or_load(authenticated_client, test_user):
    c = authenticated_client
    baseline = c.post('/api/exercise/estimate', json={**DATA, 'duration_minutes': 30}).json
    assert baseline['method'] == 'compendium_strength_2024_v1'
    expected = (3.5 - 1) * 0.0175 * (test_user.weight * 0.45359237) * 30
    assert baseline['active_calories'] == pytest.approx(expected)
    changed = deepcopy(DATA)
    changed['exercises'][0]['sets'][0] = {'reps': 50, 'weight_lbs': 200}
    result = c.post('/api/exercise/estimate', json={**changed, 'duration_minutes': 30}).json
    assert result['active_calories'] == baseline['active_calories']
    vigorous = c.post('/api/exercise/estimate', json={**DATA, 'duration_minutes': 30, 'effort': 'vigorous'}).json
    assert vigorous['met'] == 6
    assert vigorous['active_calories'] > baseline['active_calories']
    saved = c.post('/api/exercise/log', json={**DATA, 'duration_minutes': 30}).json
    test_user.weight = 400
    db.session.commit()
    edit = c.put(f"/api/exercise/log/{saved['id']}", json={**DATA, 'duration_minutes': 30}).json
    assert edit['details']['weight_lbs'] == saved['details']['weight_lbs']


def test_no_duration_or_weight_still_allows_strength_record(authenticated_client, test_user):
    test_user.weight = None
    db.session.commit()
    assert authenticated_client.post('/api/exercise/log', json=DATA).status_code == 201
    result = authenticated_client.post('/api/exercise/log', json={**DATA, 'calorie_override': 100})
    assert result.status_code == 201
    assert result.json['calories_burned'] == 100


@pytest.mark.parametrize('exercises', [[], None, ['bad'], [{'name': '', 'sets': []}],
    [{'name': 'Custom', 'sets': [{'reps': True, 'weight_lbs': 1}]}],
    [{'name': 'Custom', 'sets': [{'reps': 1.5, 'weight_lbs': 1}]}],
    [{'name': 'Custom', 'sets': [{'reps': 10, 'weight_lbs': 'NaN'}]}],
    [{'name': 'Custom', 'sets': [{'reps': 10, 'weight_lbs': -1}]}],
    [{'exercise_id': 'builtin:push_up', 'sets': [{'reps': 10, 'weight_lbs': 5}]}],
    [{'exercise_id': 'builtin:bench_press', 'equipment': 'bodyweight', 'sets': [{'reps': 10}]}],
])
def test_invalid_exercises_do_not_write(authenticated_client, exercises):
    assert authenticated_client.post('/api/exercise/log', json={**DATA, 'exercises': exercises}).status_code == 400
    assert ExerciseLog.query.count() == 0


def test_library_ownership_custom_names_and_session_ownership(authenticated_client, test_user):
    other = User(username='strength-other', email='strength-other@example.com', password_hash='unused')
    db.session.add(other)
    db.session.flush()
    own = SavedExercise(user_id=test_user.id, name='Cable Row', type='strength')
    foreign = SavedExercise(user_id=other.id, name='Private lift', type='strength')
    foreign_log = ExerciseLog(user_id=other.id, exercise_name='Private workout', activity_id='strength_training')
    db.session.add_all([own, foreign, foreign_log])
    db.session.commit()
    c = authenticated_client
    library = c.get('/api/exercise/strength-library').json
    assert any(x['id'] == f'saved:{own.id}' for x in library)
    assert not any(x['id'] == f'saved:{foreign.id}' for x in library)
    payload = {**DATA, 'exercises': [{'exercise_id': f'saved:{foreign.id}', 'sets': [{'reps': 10, 'weight_lbs': 10}]}]}
    assert c.post('/api/exercise/log', json=payload).status_code == 400
    assert c.put(f'/api/exercise/log/{foreign_log.id}', json=DATA).status_code == 404
    assert c.get('/api/exercise/latest?activity_id=strength_training').json is None
    custom = {**DATA, 'exercises': [{'name': 'My custom lift', 'equipment': 'other', 'sets': [{'reps': 10, 'weight_lbs': 10}]}]}
    assert c.post('/api/exercise/log', json=custom).json['details']['exercises'][0]['name'] == 'My custom lift'
