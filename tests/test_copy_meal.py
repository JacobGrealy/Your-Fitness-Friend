"""Copying a meal onto another date and meal type (FF-0082)."""

import datetime

import pytest

from app import db
from app.models.food import Food
from app.models.food_log import FoodLog
from app.models.user import User

TODAY = datetime.date.today()


@pytest.fixture
def meal(client, app):
    client.post('/api/auth/register', json={
        'email': 'copy@test.local', 'password': 'password123', 'name': 'Copy',
    })
    client.post('/api/auth/logout')
    client.post('/api/auth/login', json={
        'email': 'copy@test.local', 'password': 'password123',
    })
    with app.app_context():
        user = User.query.filter_by(email='copy@test.local').first()
        food = Food(
            user_id=user.id, name='Eggo toaster sticks', calories=110,
            protein_g=3, carbs_g=20, fat_g=4, serving_size='2 slices',
        )
        db.session.add(food)
        db.session.commit()
        return {'user_id': user.id, 'food_id': food.id}


def _log(client, name, calories, meal_type='breakfast', day=TODAY, photo=None, per_serving=None):
    payload = {
        'food_name': name, 'calories': calories,
        'protein_g': 1, 'carbs_g': 2, 'fat_g': 3,
        'meal_type': meal_type, 'date': day.isoformat(),
        'number_of_servings': 1,
    }
    if photo:
        payload['photo_url'] = photo
    if per_serving:
        payload['calories_per_serving'] = per_serving
    return client.post('/api/food/log', json=payload).get_json()['id']


class TestCopyMeal:
    def test_copies_every_entry_of_the_meal(self, client, app, meal):
        _log(client, 'Toaster sticks', 110)
        _log(client, 'Coffee', 5)

        response = client.post('/api/food/log/copy', json={
            'from_date': TODAY.isoformat(), 'from_meal_type': 'breakfast',
            'to_date': TODAY.isoformat(), 'to_meal_type': 'lunch',
        })

        assert response.status_code == 201
        body = response.get_json()
        assert body['copied'] == 2
        assert body['to_meal_type'] == 'lunch'

        with app.app_context():
            lunch = FoodLog.query.filter_by(
                user_id=meal['user_id'], date=TODAY, meal_type='lunch'
            ).all()
            assert sorted(log.food_name for log in lunch) == ['Coffee', 'Toaster sticks']

    def test_leaves_the_source_meal_untouched(self, client, app, meal):
        _log(client, 'Toaster sticks', 110)

        client.post('/api/food/log/copy', json={
            'from_date': TODAY.isoformat(), 'from_meal_type': 'breakfast',
            'to_date': (TODAY + datetime.timedelta(days=1)).isoformat(),
            'to_meal_type': 'breakfast',
        })

        with app.app_context():
            breakfast = FoodLog.query.filter_by(
                user_id=meal['user_id'], date=TODAY, meal_type='breakfast'
            ).all()
            assert len(breakfast) == 1

    def test_appends_rather_than_replacing_the_destination(self, client, app, meal):
        _log(client, 'Toaster sticks', 110, meal_type='breakfast')
        _log(client, 'Existing lunch', 300, meal_type='lunch')

        client.post('/api/food/log/copy', json={
            'from_date': TODAY.isoformat(), 'from_meal_type': 'breakfast',
            'to_date': TODAY.isoformat(), 'to_meal_type': 'lunch',
        })

        with app.app_context():
            lunch = FoodLog.query.filter_by(
                user_id=meal['user_id'], date=TODAY, meal_type='lunch'
            ).all()
            assert sorted(log.food_name for log in lunch) == ['Existing lunch', 'Toaster sticks']

    def test_carries_the_snapshot_including_per_serving_values(self, client, app, meal):
        log_id = _log(client, 'Toaster sticks', 220, per_serving=110)
        client.put(f'/api/food/log/{log_id}', json={'number_of_servings': 2})

        client.post('/api/food/log/copy', json={
            'from_date': TODAY.isoformat(), 'from_meal_type': 'breakfast',
            'to_date': TODAY.isoformat(), 'to_meal_type': 'dinner',
        })

        with app.app_context():
            copied = FoodLog.query.filter_by(
                user_id=meal['user_id'], date=TODAY, meal_type='dinner'
            ).one()
            assert copied.calories == 220
            assert copied.calories_per_serving == 110
            assert copied.number_of_servings == 2

    def test_does_not_copy_the_meal_photo(self, client, app, meal):
        _log(client, 'Toaster sticks', 110, photo='food_log_photos/mine.jpg')

        client.post('/api/food/log/copy', json={
            'from_date': TODAY.isoformat(), 'from_meal_type': 'breakfast',
            'to_date': TODAY.isoformat(), 'to_meal_type': 'snack',
        })

        with app.app_context():
            copied = FoodLog.query.filter_by(
                user_id=meal['user_id'], date=TODAY, meal_type='snack'
            ).one()
            assert copied.photo_url is None

    def test_an_empty_meal_is_refused_with_a_reason(self, client, meal):
        response = client.post('/api/food/log/copy', json={
            'from_date': TODAY.isoformat(), 'from_meal_type': 'dinner',
            'to_date': TODAY.isoformat(), 'to_meal_type': 'lunch',
        })

        assert response.status_code == 400
        assert 'empty' in response.get_json()['error']

    def test_refuses_another_users_meal(self, client, app, meal):
        _log(client, 'Mine', 110)
        client.post('/api/auth/logout')
        client.post('/api/auth/register', json={
            'email': 'other@test.local', 'password': 'password123', 'name': 'Other',
        })
        client.post('/api/auth/logout')
        client.post('/api/auth/login', json={
            'email': 'other@test.local', 'password': 'password123',
        })

        response = client.post('/api/food/log/copy', json={
            'from_date': TODAY.isoformat(), 'from_meal_type': 'breakfast',
            'to_date': TODAY.isoformat(), 'to_meal_type': 'lunch',
        })

        assert response.status_code == 400     # their breakfast is empty, nothing leaks

    def test_requires_a_valid_meal_type(self, client, meal):
        _log(client, 'Toaster sticks', 110)

        response = client.post('/api/food/log/copy', json={
            'from_date': TODAY.isoformat(), 'from_meal_type': 'brunch',
            'to_date': TODAY.isoformat(), 'to_meal_type': 'lunch',
        })

        assert response.status_code == 400
