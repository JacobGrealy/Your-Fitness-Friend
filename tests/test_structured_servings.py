"""Structured references do not mutate the saved food or historical totals."""
import pytest
from app.utils.quantities import serving_count, parse_label
from test_migrations import _flask
import sqlite3


@pytest.mark.parametrize('label, expected', [('100 g', (100, 'g')), ('2 tbsp', (2, 'tbsp')), ('1 egg (50g)', (None, None)), ('a bowl', (None, None))])
def test_parse(label, expected):
    assert parse_label(label) == expected


def test_compatible_conversions():
    assert serving_count(182, 'g', 100, 'g') == pytest.approx(1.82)
    assert serving_count(1, 'kg', 100, 'g') == 10
    assert serving_count(3, 'tsp', 1, 'tbsp') == pytest.approx(1)
    with pytest.raises(ValueError):
        serving_count(100, 'ml', 100, 'g')
    with pytest.raises(ValueError):
        serving_count(float('nan'), 'g', 100, 'g')


def test_log_scale_snapshot(client):
    client.post('/api/auth/register', json={'email': 'units@test.local', 'password': 'password123', 'name': 'Units'})
    client.post('/api/auth/login', json={'email': 'units@test.local', 'password': 'password123'})
    food = client.post('/api/food', json={'name': 'Apple', 'calories': 52, 'protein_g': .3,
        'carbs_g': 14, 'fat_g': .2, 'serving_amount': 100, 'serving_unit': 'g'}).get_json()
    assert food['serving_amount'] == 100
    data = {'food_id': food['id'], 'food_name': 'Apple', 'calories': 52,
        'amount': 182, 'unit': 'g', 'date': '2026-10-19', 'meal_type': 'lunch'}
    response = client.post('/api/food/log', json=data)
    assert response.status_code == 201, response.json
    log = response.json
    assert log['calories'] == 95
    assert log['carbs_g'] == pytest.approx(25.48)
    assert log['number_of_servings'] == pytest.approx(1.82)
    assert log['amount'] == 182
    # Reference must not turn into the 182 g total.
    saved = client.get('/api/food').json[0]
    assert saved['calories'] == 52
    updated = client.put(f"/api/food/log/{log['id']}", json={'amount': 200, 'unit': 'g'})
    assert updated.status_code == 200
    assert updated.json['calories'] == 104
    assert client.get('/api/food').json[0]['calories'] == 52
    assert client.put(f"/api/food/log/{log['id']}", json={'amount': 1, 'unit': 'cup'}).status_code == 400
    assert client.get(f"/api/food/log/{log['id']}").json['amount'] == 200
    copied = client.post('/api/food/log/copy', json={'from_date':'2026-10-19', 'to_date':'2026-10-20', 'from_meal_type':'lunch'}).json['logs'][0]
    assert copied['amount'] == 200
    assert copied['serving_amount'] == 100


def test_metadata_only_backfill(tmp_path):
    path = str(tmp_path / 'units.db')
    result = _flask(['db', 'upgrade', '5274c85d8204'], path)
    assert result.returncode == 0, result.stderr
    with sqlite3.connect(path) as conn:
        conn.execute("INSERT INTO users (id,email,password_hash,username) VALUES (1,'units@test','hash','Units')")
        conn.execute("INSERT INTO foods (id,user_id,name,calories,serving_size) VALUES (1,1,'Apple',52,'100 g')")
        conn.execute("INSERT INTO food_logs (id,user_id,food_name,calories,protein_g,carbs_g,fat_g,serving_size,number_of_servings,date,meal_type) VALUES (1,1,'Apple',95,0.546,25.48,0.364,'100 g',1.82,'2026-10-19','lunch')")
    result = _flask(['db', 'upgrade'], path)
    assert result.returncode == 0, result.stderr
    with sqlite3.connect(path) as conn:
        assert conn.execute('SELECT calories,protein_g,carbs_g,fat_g FROM food_logs').fetchone() == (95, .546, 25.48, .364)
        ref, amount, unit = conn.execute('SELECT serving_amount,amount,unit FROM food_logs').fetchone()
        assert ref == 100 and amount == 182 and unit == 'g'
