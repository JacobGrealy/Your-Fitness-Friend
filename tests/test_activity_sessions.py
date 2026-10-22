import pytest
from app import db
from app.models.exercise_log import ExerciseLog

BASE = {'date': '2026-10-22', 'duration_minutes': 30}
CASES = [
    {'activity_id': 'outdoor_walking', 'distance': 1.5},
    {'activity_id': 'outdoor_running', 'pace': 10},
    {'activity_id': 'treadmill_running', 'speed': 6, 'incline_percent': 5},
    {'activity_id': 'cycling', 'distance': 6},
    {'activity_id': 'stationary_cycling', 'power_watts': 100},
    {'activity_id': 'stretching'},
    {'activity_id': 'yoga', 'yoga_style': 'vinyasa'},
]


@pytest.mark.parametrize('activity', CASES)
def test_all_activity_types_preview_create_edit_dated_read_and_delete(authenticated_client, activity):
    c = authenticated_client
    payload = {**BASE, **activity}
    preview = c.post('/api/exercise/estimate', json=payload)
    assert preview.status_code == 200, preview.json
    assert preview.json['gross_calories'] > preview.json['active_calories'] > 0
    response = c.post('/api/exercise/log', json=payload)
    assert response.status_code == 201, response.json
    body = response.json
    assert body['details'] == preview.json
    assert body['activity_id'] == activity['activity_id']
    assert c.get('/api/exercise/latest?activity_id=' + activity['activity_id']).json['id'] == body['id']
    edit = c.put(f"/api/exercise/log/{body['id']}", json={**payload, 'notes': 'Edited'})
    assert edit.status_code == 200
    assert edit.json['notes'] == 'Edited'
    assert c.get('/api/exercise/logs?start_date=2026-10-22&end_date=2026-10-22').json[0]['id'] == body['id']
    assert c.delete(f"/api/exercise/{body['id']}").status_code == 200


def test_running_acsm_equation_and_grade(authenticated_client, test_user):
    c = authenticated_client
    data = {**BASE, 'activity_id': 'treadmill_running', 'speed': 6, 'incline_percent': 5}
    result = c.post('/api/exercise/estimate', json=data).json
    vo2 = 0.2 * (6 * 26.8224) + 0.9 * (6 * 26.8224) * 0.05 + 3.5
    expected = (vo2 - 3.5) * test_user.weight * 0.45359237 / 1000 * 5 * 30
    assert result['active_calories'] == pytest.approx(expected)
    assert result['method'] == 'acsm_running_v1'
    flat = c.post('/api/exercise/estimate', json={**data, 'incline_percent': 0}).json
    assert flat['active_calories'] < result['active_calories']


def test_distance_speed_and_pace_units_agree(authenticated_client):
    values = []
    for inputs in ({'distance': 3, 'distance_unit': 'mi'}, {'distance': 4.828032, 'distance_unit': 'km'},
                   {'speed': 6, 'speed_unit': 'mph'}, {'speed': 9.656064, 'speed_unit': 'km/h'},
                   {'pace': 10, 'pace_unit': 'min/mile'}, {'pace': 10 / 1.609344, 'pace_unit': 'min/km'}):
        response = authenticated_client.post('/api/exercise/estimate', json={**BASE, 'activity_id': 'outdoor_running', **inputs})
        assert response.status_code == 200
        values.append(response.json['active_calories'])
    assert all(value == pytest.approx(values[0]) for value in values)


def test_stationary_power_not_arbitrary_resistance_or_speed(authenticated_client):
    c = authenticated_client
    data = {**BASE, 'activity_id': 'stationary_cycling'}
    assert c.post('/api/exercise/estimate', json={**data, 'power_watts': 100}).json['met'] == 6
    assert c.post('/api/exercise/estimate', json={**data, 'power_watts': 150}).json['met'] == 8
    assert c.post('/api/exercise/estimate', json={**data, 'resistance': 5}).status_code == 400
    assert c.post('/api/exercise/estimate', json={**data, 'speed': 15}).status_code == 400
    assert c.post('/api/exercise/estimate', json={**data, 'effort': 'vigorous'}).json['met'] == 10.8
    with_distance = c.post('/api/exercise/estimate', json={**data, 'distance': 5, 'effort': 'moderate'}).json
    no_distance = c.post('/api/exercise/estimate', json={**data, 'effort': 'moderate'}).json
    assert with_distance['active_calories'] == no_distance['active_calories']


def test_mobility_and_override(authenticated_client):
    c = authenticated_client
    assert c.post('/api/exercise/estimate', json={**BASE, 'activity_id': 'stretching'}).json['met'] == 2.3
    assert c.post('/api/exercise/estimate', json={**BASE, 'activity_id': 'yoga', 'yoga_style': 'power'}).json['met'] == 4
    result = c.post('/api/exercise/log', json={**BASE, 'activity_id': 'yoga', 'calorie_override': 100})
    assert result.json['calories_burned'] == 100
    assert result.json['details']['active_calories'] > 0


@pytest.mark.parametrize('changes', [
    {'duration_minutes': 'NaN'}, {'duration_minutes': True}, {'duration_minutes': 0},
    {'distance': -1}, {'distance_unit': 'yards'}, {'distance': 1000},
    {'speed': 3, 'distance': 1}, {'arms_supported': True}, {'incline_percent': 5},
])
def test_invalid_inputs_never_write(authenticated_client, changes):
    response = authenticated_client.post('/api/exercise/log', json={**BASE, 'activity_id': 'outdoor_walking', 'distance': 1, **changes})
    assert response.status_code == 400, response.json
    assert ExerciseLog.query.count() == 0


def test_snapshot_and_activity_immutability(authenticated_client, test_user):
    c = authenticated_client
    payload = {**BASE, 'activity_id': 'outdoor_walking', 'distance': 1.5}
    saved = c.post('/api/exercise/log', json=payload).json
    test_user.weight = 400
    db.session.commit()
    edited = c.put(f"/api/exercise/log/{saved['id']}", json=payload).json
    assert edited['details']['weight_lbs'] == saved['details']['weight_lbs']
    assert c.put(f"/api/exercise/log/{saved['id']}", json={**BASE, 'activity_id': 'stretching'}).status_code == 400


def test_catalog_lists_supported_formats(authenticated_client):
    ids = {item['id'] for item in authenticated_client.get('/api/exercise/catalog').json}
    assert {item['activity_id'] for item in CASES} <= ids
