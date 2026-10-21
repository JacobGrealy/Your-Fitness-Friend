import pytest
from app.utils.exercise_calories import treadmill_estimate

WEIGHT = {'weight_kg': 100, 'weight_lbs': 220.462262, 'weight_source': 'profile', 'weight_date': None}
DATA = {'activity_id': 'treadmill_walking', 'date': '2026-10-21', 'duration_minutes': 87, 'speed': 1.4, 'incline_percent': 9}


def test_supported_calories_are_exactly_three_quarters():
    baseline = treadmill_estimate(DATA, WEIGHT)
    result = treadmill_estimate({**DATA, 'arms_supported': True}, WEIGHT)
    for field in ('active_calories', 'gross_calories', 'calories_burned'):
        assert result[field] == pytest.approx(baseline[field] * 0.75)
    assert result['unadjusted_active_calories'] == baseline['active_calories']
    assert result['unadjusted_gross_calories'] == baseline['gross_calories']
    assert result['support_multiplier'] == 0.75
    assert baseline['arms_supported'] is False
    assert treadmill_estimate({**DATA, 'arms_supported': False}, WEIGHT) == baseline


@pytest.mark.parametrize('value', [None, 'true', 'false', 1, 0, [], {}])
def test_boolean_validation(value):
    with pytest.raises(ValueError, match='must be a boolean'):
        treadmill_estimate({**DATA, 'arms_supported': value}, WEIGHT)


def test_override_adjusted_once_and_original_retained():
    result = treadmill_estimate({**DATA, 'arms_supported': True, 'calorie_override': 400}, WEIGHT)
    assert result['calorie_override'] == 400
    assert result['calories_burned'] == 300


def test_preview_save_and_edit_roundtrip(authenticated_client):
    client = authenticated_client
    baseline = client.post('/api/exercise/estimate', json=DATA).json
    payload = {**DATA, 'arms_supported': True}
    preview = client.post('/api/exercise/estimate', json=payload)
    assert preview.status_code == 200
    saved = client.post('/api/exercise/log', json=payload)
    assert saved.status_code == 201
    assert saved.json['details'] == preview.json
    assert saved.json['calories_burned'] == pytest.approx(baseline['calories_burned'] * 0.75)
    log_id = saved.json['id']
    for _ in range(2):
        edited = client.put(f'/api/exercise/log/{log_id}', json=payload)
        assert edited.json['calories_burned'] == saved.json['calories_burned']
    assert client.get(f'/api/exercise/log/{log_id}').json['details']['arms_supported'] is True
    unchecked = client.put(f'/api/exercise/log/{log_id}', json=DATA)
    assert unchecked.json['calories_burned'] == baseline['calories_burned']
