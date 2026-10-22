import pytest
from app import db
from app.models.health_log import HealthLog
from app.models.user import User

MED = {'kind': 'medication', 'dose_mg': 1.5, 'logged_at': '2026-10-22T08:30', 'notes': 'Morning pill'}
BOWEL = {'kind': 'bowel', 'logged_at': '2026-10-22T10:15', 'notes': 'Normal'}


def test_defaults_and_last_logged_selection(authenticated_client):
    c = authenticated_client
    assert c.get('/api/health/options').json['dose_options_mg'] == [1.5, 4, 9, 25]
    assert c.get('/api/health/options').json['default_dose_mg'] == 1.5
    assert c.post('/api/health/logs', json={**MED, 'dose_mg': 9}).status_code == 201
    assert c.post('/api/health/logs', json={**MED, 'dose_mg': 4, 'logged_at': '2026-10-01T09:00'}).status_code == 201
    c.post('/api/health/logs', json=BOWEL)
    assert c.get('/api/health/options').json['default_dose_mg'] == 4


@pytest.mark.parametrize('payload', [MED, BOWEL])
def test_create_read_edit_delete_and_dated_reads(authenticated_client, payload):
    c = authenticated_client
    response = c.post('/api/health/logs', json=payload)
    assert response.status_code == 201
    body = response.json
    assert body['logged_at'] == payload['logged_at']
    log_id = body['id']
    assert len(c.get('/api/health/logs?date=2026-10-22').json) == 1
    assert c.get('/api/health/logs?date=2026-10-21').json == []
    edited = c.put(f'/api/health/logs/{log_id}', json={**payload, 'notes': 'Updated', 'logged_at': '2026-10-21T23:59'})
    assert edited.status_code == 200
    assert c.get(f'/api/health/logs/{log_id}').json['notes'] == 'Updated'
    assert c.get('/api/health/logs?date=2026-10-22').json == []
    assert c.delete(f'/api/health/logs/{log_id}').status_code == 200
    assert c.get(f'/api/health/logs/{log_id}').status_code == 404


@pytest.mark.parametrize('change', [
    {'dose_mg': 2}, {'dose_mg': True}, {'dose_mg': '1.5'}, {'dose_mg': None},
    {'dose_mg': float('inf')}, {'kind': 'unknown'}, {'notes': 1}, {'notes': 'x' * 1001},
    {'logged_at': '2026-02-30T12:00'}, {'logged_at': '2026-10-22T24:00'},
    {'logged_at': '2026-10-22T08:30Z'}, {'logged_at': '20261022T08:30'},
])
def test_invalid_inputs_do_not_write(authenticated_client, change):
    assert authenticated_client.post('/api/health/logs', json={**MED, **change}).status_code == 400
    assert HealthLog.query.count() == 0


def test_bowel_cannot_have_dose_and_kinds_cannot_change(authenticated_client):
    assert authenticated_client.post('/api/health/logs', json={**BOWEL, 'dose_mg': 1.5}).status_code == 400
    body = authenticated_client.post('/api/health/logs', json=MED).json
    assert authenticated_client.put(f"/api/health/logs/{body['id']}", json=BOWEL).status_code == 400
    assert authenticated_client.get(f"/api/health/logs/{body['id']}").json['kind'] == 'medication'


def test_other_users_entries_and_defaults_are_private(authenticated_client):
    from datetime import datetime
    other = User(username='health-other', email='health-other@example.com', password_hash='unused')
    db.session.add(other)
    db.session.flush()
    log = HealthLog(user_id=other.id, kind='medication', dose_mg=25, logged_at=datetime(2026, 10, 22, 8))
    db.session.add(log)
    db.session.commit()
    c = authenticated_client
    assert c.get('/api/health/logs?date=2026-10-22').json == []
    assert c.get('/api/health/options').json['default_dose_mg'] == 1.5
    assert c.get(f'/api/health/logs/{log.id}').status_code == 404
    assert c.put(f'/api/health/logs/{log.id}', json=MED).status_code == 404
    assert c.delete(f'/api/health/logs/{log.id}').status_code == 404


def test_unauthenticated_requests_are_rejected(client):
    for path in ('/api/health/options', '/api/health/logs', '/api/health/logs/1'):
        assert client.get(path).status_code == 401


@pytest.mark.parametrize('date', ['20261022', '2026-02-30', 'bad', ''])
def test_invalid_date_filter(authenticated_client, date):
    assert authenticated_client.get('/api/health/logs?date=' + date).status_code == 400
