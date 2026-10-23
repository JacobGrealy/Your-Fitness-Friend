from datetime import datetime
import pytest
from app import db
from app.models.hydration_log import HydrationLog
from app.models.health_log import HealthLog
from app.models.user import User

BASE = {'amount_oz': 24, 'logged_at': '2026-10-22T08:45', 'notes': 'Finished a bottle'}


def test_hydration_crud_daily_total_and_own_last_default(authenticated_client):
    c = authenticated_client
    assert c.get('/api/hydration/options').json['default_amount_oz'] == 24
    first = c.post('/api/hydration/logs', json=BASE)
    assert first.status_code == 201
    assert first.json['logged_at'] == BASE['logged_at']
    second = c.post('/api/hydration/logs', json={**BASE, 'amount_oz': 12.5, 'logged_at': '2026-10-21T12:00'})
    assert c.get('/api/hydration/options').json['default_amount_oz'] == 12.5
    daily = c.get('/api/hydration/logs?date=2026-10-22').json
    assert daily['total_oz'] == 24
    assert len(daily['logs']) == 1
    updated = c.put(f"/api/hydration/logs/{first.json['id']}", json={**BASE, 'amount_oz': 30})
    assert updated.status_code == 200
    assert c.get('/api/hydration/logs?date=2026-10-22').json['total_oz'] == 30
    assert c.get('/api/hydration/options').json['default_amount_oz'] == 12.5
    assert c.delete(f"/api/hydration/logs/{second.json['id']}").status_code == 200
    assert c.get('/api/hydration/options').json['default_amount_oz'] == 30
    assert HealthLog.query.count() == 0


@pytest.mark.parametrize('amount', [0, -1, 1001, True, None, '24', float('inf'), float('nan')])
def test_invalid_ounces_never_write(authenticated_client, amount):
    assert authenticated_client.post('/api/hydration/logs', json={**BASE, 'amount_oz': amount}).status_code == 400
    assert HydrationLog.query.count() == 0


@pytest.mark.parametrize('changes', [{'logged_at': '2026-02-30T12:00'}, {'logged_at': '2026-10-22T08:45Z'}, {'logged_at': ''}, {'notes': 'x' * 1001}, {'notes': 123}])
def test_invalid_notes_and_local_time(authenticated_client, changes):
    assert authenticated_client.post('/api/hydration/logs', json={**BASE, **changes}).status_code == 400
    assert HydrationLog.query.count() == 0


def test_owner_scoped_defaults_reads_edits_and_deletes(authenticated_client):
    other = User(username='water-other', email='water-other@example.com', password_hash='unused')
    db.session.add(other); db.session.flush()
    log = HydrationLog(user_id=other.id, amount_oz=100, logged_at=datetime(2026, 10, 22, 8))
    db.session.add(log); db.session.commit()
    c = authenticated_client
    assert c.get('/api/hydration/options').json['default_amount_oz'] == 24
    assert c.get('/api/hydration/logs?date=2026-10-22').json['logs'] == []
    for method in ('get', 'put', 'delete'):
        assert getattr(c, method)(f'/api/hydration/logs/{log.id}', json=BASE).status_code == 404
    assert db.session.get(HydrationLog, log.id) is not None


def test_midnight_local_days_and_invalid_query_date(authenticated_client):
    c = authenticated_client
    for stamp in ('2026-10-21T23:59', '2026-10-22T00:00'):
        assert c.post('/api/hydration/logs', json={**BASE, 'logged_at': stamp}).status_code == 201
    assert c.get('/api/hydration/logs?date=2026-10-21').json['total_oz'] == 24
    assert c.get('/api/hydration/logs?date=2026-10-22').json['total_oz'] == 24
    assert c.get('/api/hydration/logs?date=20261022').status_code == 400


def test_hydration_requires_login(client):
    for endpoint in ('/api/hydration/options', '/api/hydration/logs', '/api/hydration/logs/1'):
        assert client.get(endpoint).status_code == 401
