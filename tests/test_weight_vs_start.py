"""Home's weight card compares against the starting weight (FF-0090).

Two defects this replaces: the card compared a log to itself when the newest entry *was*
yesterday's ("vs. Yesterday 0.0" on a day you never weighed in), and it simply hid when
yesterday had no entry.
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
        'email': 'vsstart@test.local', 'password': 'password123', 'name': 'Start',
    })
    client.post('/api/auth/logout')
    client.post('/api/auth/login', json={
        'email': 'vsstart@test.local', 'password': 'password123',
    })
    with app.app_context():
        return User.query.filter_by(email='vsstart@test.local').first().id


def _weigh_in(user_id, day, weight):
    with db.session.begin_nested():
        db.session.add(WeightLog(
            user_id=user_id, weight=weight,
            recorded_at=datetime.datetime.combine(day, datetime.time.min),
        ))
    db.session.commit()


def _weight(client, day=None):
    url = '/api/dashboard/daily' if day is None else f'/api/dashboard/daily?date={day.isoformat()}'
    return client.get(url).get_json()['weight']


class TestSameDayWeighIns:
    def test_the_later_entry_wins_when_timestamps_tie(self, client, app, user_id):
        # Weight logs are stored at midnight, so two entries on one day share a timestamp;
        # only the id orders them (FF-0090).
        _weigh_in(user_id, TODAY, 264.7)
        _weigh_in(user_id, TODAY, 257.5)

        weight = _weight(client)

        assert weight['current'] == 257.5
        assert weight['start'] == 264.7
        assert weight['change_from_start'] == -7.2


class TestComparedToTheStart:
    def test_reports_the_change_since_the_first_weigh_in(self, client, app, user_id):
        _weigh_in(user_id, TODAY - datetime.timedelta(days=2), 264.7)
        _weigh_in(user_id, TODAY, 257.5)

        weight = _weight(client)

        assert weight['current'] == 257.5
        assert weight['start'] == 264.7
        assert weight['start_date'] == (TODAY - datetime.timedelta(days=2)).isoformat()
        assert weight['change_from_start'] == -7.2

    def test_one_weigh_in_is_not_a_change(self, client, app, user_id):
        _weigh_in(user_id, TODAY, 257.5)

        weight = _weight(client)

        assert weight['start'] == 257.5
        assert weight['change_from_start'] is None, 'a single log cannot differ from itself'

    def test_no_weigh_ins_at_all(self, client, app, user_id):
        weight = _weight(client)

        assert weight['current'] is None
        assert weight['start'] is None
        assert weight['change_from_start'] is None
        assert weight['current_date'] is None

    def test_dates_the_current_number(self, client, app, user_id):
        # Newest entry is two days old: the card must be able to say so.
        _weigh_in(user_id, TODAY - datetime.timedelta(days=5), 270.0)
        _weigh_in(user_id, TODAY - datetime.timedelta(days=2), 264.7)

        weight = _weight(client)

        assert weight['current_date'] == (TODAY - datetime.timedelta(days=2)).isoformat()

    def test_still_offers_the_yesterday_figure_separately(self, client, app, user_id):
        _weigh_in(user_id, TODAY - datetime.timedelta(days=1), 259.3)
        _weigh_in(user_id, TODAY, 257.5)

        weight = _weight(client)

        # kept for compatibility, and now correct even for a midnight-stamped log
        assert weight['change_from_yesterday'] == -1.8

    def test_yesterday_is_not_compared_to_itself(self, client, app, user_id):
        # The bug: newest log IS yesterday's, so current == yesterday.
        _weigh_in(user_id, TODAY - datetime.timedelta(days=1), 259.3)

        weight = _weight(client)

        assert weight['change_from_yesterday'] == 0.0     # honest: it is the same log
        assert weight['change_from_start'] is None        # and there is no journey yet

    def test_a_week_of_frequent_logging_does_not_lose_the_start(self, client, app, user_id):
        # The old query loaded only 8 rows, so the oldest could fall outside the window.
        for offset in range(9, -1, -1):
            _weigh_in(user_id, TODAY - datetime.timedelta(days=offset), 250.0 + offset)

        weight = _weight(client)

        assert weight['start'] == 259.0
        assert weight['start_date'] == (TODAY - datetime.timedelta(days=9)).isoformat()
        assert weight['change_from_start'] == -9.0
