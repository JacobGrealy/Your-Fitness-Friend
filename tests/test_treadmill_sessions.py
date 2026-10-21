from unittest.mock import patch

from app import db
from app.models.exercise_log import ExerciseLog

PAYLOAD = {'activity_id': 'treadmill_walking', 'date': '2026-10-21',
           'duration_minutes': 30, 'speed': 2.5, 'incline_percent': 3}


def test_catalog_preview_log_edit_history_delete(authenticated_client, test_user):
    client = authenticated_client
    assert client.get('/api/exercise/catalog').json[0]['id'] == 'treadmill_walking'
    with patch('app.routes.exercise.qwen_client.estimate_exercise_calories', side_effect=AssertionError('No AI')):
        preview = client.post('/api/exercise/estimate', json=PAYLOAD)
        assert preview.status_code == 200
        assert ExerciseLog.query.count() == 0
        response = client.post('/api/exercise/log', json=PAYLOAD)
        assert response.status_code == 201
        body = response.json
        assert body['details'] == preview.json
        assert body['calories_burned'] == body['details']['active_calories']
        assert body['details']['gross_calories'] > body['calories_burned']
        original_weight = body['details']['weight_lbs']
        test_user.weight = 300
        db.session.commit()
        response = client.put(f"/api/exercise/log/{body['id']}", json={**PAYLOAD, 'duration_minutes': 60})
        assert response.status_code == 200
        assert response.json['details']['weight_lbs'] == original_weight
        assert response.json['calories_burned'] == body['calories_burned'] * 2
        history = client.get('/api/exercise/logs?start_date=2026-10-21&end_date=2026-10-21').json
        assert history[0]['tracking_format'] == 'treadmill'
        assert client.delete(f"/api/exercise/{body['id']}").status_code == 200


def test_requested_slow_incline_preview_and_save(authenticated_client):
    payload = {**PAYLOAD, 'speed': 1.4, 'duration_minutes': 87, 'incline_percent': 9}
    preview = authenticated_client.post('/api/exercise/estimate', json=payload)
    assert preview.status_code == 200
    result = authenticated_client.post('/api/exercise/log', json=payload)
    assert result.status_code == 201
    assert result.json['details'] == preview.json
    assert result.json['calories_burned'] > 0
    assert result.json['details']['method'] == 'acsm_walking_v2'
    result = authenticated_client.post('/api/exercise/log', json={**payload, 'calorie_override': 70})
    assert result.status_code == 201
    assert result.json['calories_burned'] == 70
    assert result.json['details']['active_calories'] > 0


def test_unknown_activity_and_legacy_preservation(authenticated_client, test_user):
    assert authenticated_client.post('/api/exercise/log', json={**PAYLOAD, 'activity_id': 'invented'}).status_code == 400
    log = ExerciseLog(user_id=test_user.id, exercise_name='Old walk', duration=10, calories_burned=50)
    db.session.add(log)
    db.session.commit()
    assert authenticated_client.put(f'/api/exercise/log/{log.id}', json=PAYLOAD).status_code == 400
    assert log.details is None
    assert log.calories_burned == 50


def test_edit_requires_ownership(authenticated_client):
    from app.models.user import User
    other = User(username='other', email='other@example.com', password_hash='unused')
    db.session.add(other)
    db.session.flush()
    log = ExerciseLog(user_id=other.id, exercise_name='Private walk', activity_id='treadmill_walking', duration=10)
    db.session.add(log)
    db.session.commit()
    assert authenticated_client.put(f'/api/exercise/log/{log.id}', json=PAYLOAD).status_code == 404
    assert authenticated_client.get(f'/api/exercise/log/{log.id}').status_code == 404
    assert authenticated_client.delete(f'/api/exercise/{log.id}').status_code == 404
    assert authenticated_client.get('/api/exercise/logs').json == []
    assert authenticated_client.post('/api/exercise/estimate', json={**PAYLOAD, 'log_id': log.id}).status_code == 404


def test_invalid_edit_is_atomic_and_snapshot_survives_missing_profile_weight(authenticated_client, test_user):
    body = authenticated_client.post('/api/exercise/log', json=PAYLOAD).json
    log_id = body['id']
    test_user.weight = None
    db.session.commit()
    result = authenticated_client.put(f'/api/exercise/log/{log_id}', json={**PAYLOAD, 'notes': 'Updated'})
    assert result.status_code == 200
    assert result.json['details'] == body['details']
    preview = authenticated_client.post('/api/exercise/estimate', json={**PAYLOAD, 'log_id': log_id})
    assert preview.status_code == 200
    assert preview.json == body['details']
    assert authenticated_client.put(f'/api/exercise/log/{log_id}', json={**PAYLOAD, 'speed': 'NaN'}).status_code == 400
    saved = authenticated_client.get(f'/api/exercise/log/{log_id}').json
    assert saved['notes'] == 'Updated'
    assert saved['details'] == body['details']


def test_manual_override_retains_calculated_values(authenticated_client):
    response = authenticated_client.post('/api/exercise/log', json={**PAYLOAD, 'calorie_override': 0})
    assert response.status_code == 201
    assert response.json['calories_burned'] == 0
    assert response.json['details']['active_calories'] > 0
    assert response.json['details']['calorie_override'] == 0
