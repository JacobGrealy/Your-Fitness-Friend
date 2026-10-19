"""Today's weigh-in must reach the Home trend (FF-0089).

The filter compared a DateTime column against bare dates. SQLite compares the stored
'2026-10-19 00:00:00.000000' with '2026-10-19' as text and the longer value sorts after, so the
end day could never match — every weigh-in dated today was dropped, whatever the time.
"""

import datetime

import pytest

from app import db
from app.models.user import User
from app.models.weight_log import WeightLog

TODAY = datetime.date.today()


@pytest.fixture
def user_id(client, app):
    client.post('/api/auth/register', json={
        'email': 'today@test.local', 'password': 'password123', 'name': 'Today',
    })
    client.post('/api/auth/logout')
    client.post('/api/auth/login', json={
        'email': 'today@test.local', 'password': 'password123',
    })
    with app.app_context():
        return User.query.filter_by(email='today@test.local').first().id


def _weigh_in(user_id, when, weight=200.0):
    with db.session.begin_nested():
        db.session.add(WeightLog(user_id=user_id, weight=weight, recorded_at=when))
    db.session.commit()


class TestTodayIsIncluded:
    def test_a_weigh_in_from_today_is_returned(self, client, app, user_id):
        _weigh_in(user_id, datetime.datetime.combine(TODAY, datetime.time(7, 30)), 257.5)

        body = client.get('/api/dashboard/weight-trend?days=7').get_json()

        dates = [entry['date'] for entry in body]
        assert TODAY.isoformat() in dates

    def test_a_weigh_in_at_midnight_is_returned(self, client, app, user_id):
        # The stored value is 'YYYY-MM-DD 00:00:00', which the old bare-date comparison
        # dropped; this is the exact shape the live database holds.
        _weigh_in(user_id, datetime.datetime.combine(TODAY, datetime.time.min), 258.0)

        body = client.get('/api/dashboard/weight-trend?days=7').get_json()

        assert TODAY.isoformat() in [entry['date'] for entry in body]

    def test_a_late_evening_weigh_in_is_returned(self, client, app, user_id):
        _weigh_in(user_id, datetime.datetime.combine(TODAY, datetime.time(22, 45)), 259.0)

        body = client.get('/api/dashboard/weight-trend?days=7').get_json()

        assert TODAY.isoformat() in [entry['date'] for entry in body]

    def test_the_whole_window_still_arrives(self, client, app, user_id):
        for offset in range(7):
            day = TODAY - datetime.timedelta(days=offset)
            _weigh_in(user_id, datetime.datetime.combine(day, datetime.time(8, 0)), 250.0 + offset)

        body = client.get('/api/dashboard/weight-trend?days=7').get_json()

        assert len(body) == 7

    def test_yesterday_alone_still_works(self, client, app, user_id):
        yesterday = TODAY - datetime.timedelta(days=1)
        _weigh_in(user_id, datetime.datetime.combine(yesterday, datetime.time.min), 264.7)

        body = client.get('/api/dashboard/weight-trend?days=7').get_json()

        assert [entry['date'] for entry in body] == [yesterday.isoformat()]

    def test_nothing_outside_the_window_leaks_in(self, client, app, user_id):
        old = TODAY - datetime.timedelta(days=30)
        _weigh_in(user_id, datetime.datetime.combine(old, datetime.time(8, 0)), 270.0)

        body = client.get('/api/dashboard/weight-trend?days=7').get_json()

        assert body == []
