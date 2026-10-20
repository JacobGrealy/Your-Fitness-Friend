"""The food owns its picture; logs inherit or override it (FF-0102)."""

import datetime
import os

import pytest

from app.models.food import Food
from app.models.food_log import FoodLog
from app.utils.uploads import stored_file_path, upload_dir

TODAY = datetime.date.today()


@pytest.fixture
def photo():
    """A real file in the test uploads directory, as an upload would leave it."""
    os.makedirs(upload_dir('food_log_photos'), exist_ok=True)
    path = os.path.join(upload_dir('food_log_photos'), 'shared.jpg')
    with open(path, 'wb') as handle:
        handle.write(b'\xff\xd8\xff\xd9')
    return 'food_log_photos/shared.jpg'


@pytest.fixture
def client_with_food(client, app, photo):
    client.post('/api/auth/register', json={
        'email': 'photos@test.local', 'password': 'password123', 'name': 'Photos'})
    client.post('/api/auth/login', json={'email': 'photos@test.local', 'password': 'password123'})
    with app.app_context():
        food = Food(user_id=1, name='Apple', calories=52, protein_g=.3, carbs_g=14, fat_g=.2,
                    serving_amount=100, serving_unit='g', photo_url=photo)
        from app import db
        db.session.add(food)
        db.session.commit()
        return {'client': client, 'food_id': food.id, 'photo': photo}


def _log(client, food_id, photo_url, meal='lunch', day=None):
    return client.post('/api/food/log', json={
        'food_id': food_id, 'food_name': 'Apple', 'calories': 52,
        'serving_amount': 100, 'serving_unit': 'g', 'amount': 182, 'unit': 'g',
        'photo_url': photo_url, 'date': str(day or TODAY), 'meal_type': meal})


def test_a_log_inherits_the_foods_picture(client_with_food):
    client, food_id, photo = (client_with_food['client'], client_with_food['food_id'],
                             client_with_food['photo'])

    body = client.get(f'/api/food/latest-photo?food_id={food_id}').get_json()

    assert body['photo_url'] == photo
    assert body['source'] == 'food'


def test_recent_foods_advertise_the_foods_picture(client_with_food):
    client, food_id = client_with_food['client'], client_with_food['food_id']
    _log(client, food_id, None)          # a log with no picture of its own

    recent = client.get('/api/food/recent?days=7').get_json()

    assert recent[0]['photo_url'] == client_with_food['photo']


def test_copying_a_meal_shares_the_picture(client_with_food, app):
    client, food_id, photo = (client_with_food['client'], client_with_food['food_id'],
                             client_with_food['photo'])
    _log(client, food_id, photo)

    copied = client.post('/api/food/log/copy', json={
        'from_date': str(TODAY), 'to_date': str(TODAY + datetime.timedelta(days=1)),
        'from_meal_type': 'lunch'}).get_json()['logs']

    assert copied[0]['photo_url'] == photo
    with app.app_context():
        assert os.path.exists(stored_file_path(photo))
        assert len(os.listdir(upload_dir('food_log_photos'))) == 1     # still one file


def test_a_log_photo_overrides_without_changing_the_food(client_with_food):
    client, food_id = client_with_food['client'], client_with_food['food_id']
    other = os.path.join(upload_dir('food_log_photos'), 'meal.jpg')
    with open(other, 'wb') as handle:
        handle.write(b'\xff\xd8\xff\xd9')

    logged = _log(client, food_id, 'food_log_photos/meal.jpg').get_json()

    assert logged['photo_url'] == 'food_log_photos/meal.jpg'
    assert client.get('/api/food').get_json()[0]['photo_url'] == client_with_food['photo']


def test_deleting_a_log_photo_keeps_the_foods_picture(client_with_food, app):
    client, food_id, photo = (client_with_food['client'], client_with_food['food_id'],
                             client_with_food['photo'])
    logged = _log(client, food_id, photo).get_json()

    response = client.delete(f"/api/food/log/{logged['id']}/photo")

    assert response.get_json()['file_kept'] is True      # the food still shows it
    with app.app_context():
        assert os.path.exists(stored_file_path(photo))
    assert client.get('/api/food').get_json()[0]['photo_url'] == photo


def test_migration_backfills_each_food_from_its_newest_log(tmp_path):
    """Existing thumbnails survive the move from log-owned to food-owned pictures."""
    import sqlite3
    from test_migrations import _flask

    path = str(tmp_path / 'photos.db')
    assert _flask(['db', 'upgrade', 'c19600000001'], path).returncode == 0
    with sqlite3.connect(path) as conn:
        conn.execute("INSERT INTO users (id,email,password_hash,username) VALUES (1,'a@b','h','A')")
        conn.execute("INSERT INTO foods (id,user_id,name,calories) VALUES (1,1,'Apple',52)")
        conn.execute("""INSERT INTO food_logs (id,user_id,food_id,food_name,calories,photo_url,date,meal_type)
                        VALUES (1,1,1,'Apple',52,'food_log_photos/old.jpg','2026-10-01','lunch')""")
        conn.execute("""INSERT INTO food_logs (id,user_id,food_id,food_name,calories,photo_url,date,meal_type)
                        VALUES (2,1,1,'Apple',52,'food_log_photos/new.jpg','2026-10-15','lunch')""")
        conn.execute("""INSERT INTO food_logs (id,user_id,food_id,food_name,calories,photo_url,date,meal_type)
                        VALUES (3,1,1,'Apple',52,NULL,'2026-10-19','dinner')""")

    assert _flask(['db', 'upgrade'], path).returncode == 0

    with sqlite3.connect(path) as conn:
        # newest picture wins; a newer log with no picture does not blank it
        assert conn.execute('SELECT photo_url FROM foods WHERE id=1').fetchone()[0] == 'food_log_photos/new.jpg'
        # and no log's own photo was touched
        assert [r[0] for r in conn.execute('SELECT photo_url FROM food_logs ORDER BY id')] == [
            'food_log_photos/old.jpg', 'food_log_photos/new.jpg', None]
