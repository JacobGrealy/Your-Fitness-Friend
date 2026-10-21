from datetime import datetime

import pytest

from app import db
from app.models.weight_log import WeightLog
from app.utils.exercise_calories import treadmill_estimate, weight_snapshot, session_day

WEIGHT = {'weight_kg': 100, 'weight_lbs': 220.462262, 'weight_source': 'profile', 'weight_date': None}


def estimate(**changes):
    return treadmill_estimate({'duration_minutes': 30, 'speed': 3, 'incline_percent': 0, **changes}, WEIGHT)


def test_acsm_reference_and_active_vs_gross():
    result = estimate()
    assert result['method'] == 'acsm_walking_v2'
    assert result['gross_calories'] == pytest.approx(173.2008)
    assert result['active_calories'] == pytest.approx(120.7008)
    assert result['distance_miles'] == 1.5
    assert estimate(incline_percent=5)['active_calories'] > result['active_calories']


def test_equivalent_units_and_pace():
    reference = estimate()
    for inputs in ({'speed': 4.828032, 'speed_unit': 'km/h'},
                   {'speed': None, 'pace': 20, 'pace_unit': 'min/mile'},
                   {'speed': None, 'pace': 20 / 1.609344, 'pace_unit': 'min/km'}):
        assert estimate(**inputs)['active_calories'] == pytest.approx(reference['active_calories'])


def test_requested_slow_incline_session_uses_acsm():
    result = estimate(duration_minutes=87, speed=1.4, incline_percent=9)
    # 1.4 mph = 37.55136 m/min; VO2 = 0.1*s + 1.8*s*0.09 + 3.5.
    assert result['method'] == 'acsm_walking_v2'
    assert result['gross_calories'] == pytest.approx(580.22284992)
    assert result['active_calories'] == pytest.approx(427.97284992)
    assert result['distance_miles'] == pytest.approx(2.03)
    assert any('extrapolated' in warning for warning in result['warnings'])
    assert not any('extrapolated' in warning for warning in estimate()['warnings'])


@pytest.mark.parametrize('speed', [0.5, 1, 1.5, 4, 5.5])
def test_all_accepted_walking_speeds_use_acsm_with_disclosure(speed):
    result = estimate(speed=speed, incline_percent=5)
    assert result['method'] == 'acsm_walking_v2'
    assert result['active_calories'] > 0
    assert any('extrapolated' in warning for warning in result['warnings'])


@pytest.mark.parametrize('changes', [
    {'duration_minutes': 0}, {'duration_minutes': 'NaN'}, {'speed': True},
    {'speed': 'Infinity'}, {'speed': 6}, {'incline_percent': -1},
    {'incline_percent': 21}, {'speed_unit': 'knots'}, {'pace': 20},
    {'speed': None}, {'speed': None, 'pace': 0},
])
def test_invalid_inputs(changes):
    with pytest.raises(ValueError):
        estimate(**changes)


def test_historical_weight_and_same_day_tie_break(test_user):
    db.session.add_all([
        WeightLog(user_id=test_user.id, weight=200, recorded_at=datetime(2026, 1, 1)),
        WeightLog(user_id=test_user.id, weight=190, recorded_at=datetime(2026, 1, 1)),
        WeightLog(user_id=test_user.id, weight=180, recorded_at=datetime(2026, 2, 1)),
    ])
    db.session.commit()
    result = weight_snapshot(test_user, session_day('2026-01-15'))
    assert result['weight_lbs'] == 190
    assert result['weight_source'] == 'weigh_in'
    assert weight_snapshot(test_user, session_day('2025-01-01'))['weight_source'] == 'profile'


@pytest.mark.parametrize('day', ['20260101', '2026-02-30', None, '2026-01-01T00:00:00'])
def test_calendar_dates_only(day):
    with pytest.raises(ValueError):
        session_day(day)
