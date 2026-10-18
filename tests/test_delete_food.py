"""Deleting a custom food (FF-0065).

The Custom Foods screen has always called DELETE /api/food/<id>; the handler did not
exist, so the trash can did nothing at all. These tests pin the ownership rules and
the decision that diary entries survive a tidy-up.
"""

from datetime import date

import pytest

from app import db
from app.models.food import Food
from app.models.food_log import FoodLog
from app.models.user import User


@pytest.fixture
def authed(client, test_user):
    response = client.post(
        '/api/auth/login',
        json={'email': test_user.email, 'password': 'testpass123'},
    )
    assert response.status_code == 200, response.get_json()
    return client


@pytest.fixture
def custom_food(app, test_user):
    with app.app_context():
        food = Food(
            user_id=test_user.id,
            name='Honey roasted peanuts',
            calories=150,
            protein_g=6,
            carbs_g=8,
            fat_g=12,
            serving_size='0.25 cup (28 g)',
        )
        db.session.add(food)
        db.session.commit()
        return food.id


def test_owner_can_delete_their_food(authed, app, custom_food):
    response = authed.delete(f'/api/food/{custom_food}')

    assert response.status_code == 200
    assert response.get_json()['id'] == custom_food
    assert response.get_json()['logs_kept'] == 0

    with app.app_context():
        assert Food.query.get(custom_food) is None


def test_deleting_twice_is_a_404(authed, app, custom_food):
    assert authed.delete(f'/api/food/{custom_food}').status_code == 200
    assert authed.delete(f'/api/food/{custom_food}').status_code == 404


def test_another_users_food_is_not_deletable(authed, app, custom_food):
    with app.app_context():
        other = User(username='other', email='other@test.com')
        other.set_password('otherpass123')
        db.session.add(other)
        db.session.commit()
        food = Food(user_id=other.id, name='Someone else\'s bar', calories=200)
        db.session.add(food)
        db.session.commit()
        other_food_id = food.id

    response = authed.delete(f'/api/food/{other_food_id}')

    # Same answer as "no such food": ownership must not be probeable.
    assert response.status_code == 404
    with app.app_context():
        assert Food.query.get(other_food_id) is not None


def test_shared_food_is_not_deletable(authed, app):
    with app.app_context():
        shared = Food(user_id=None, name='Shared apple', calories=95)
        db.session.add(shared)
        db.session.commit()
        shared_id = shared.id

    assert authed.delete(f'/api/food/{shared_id}').status_code == 404
    with app.app_context():
        assert Food.query.get(shared_id) is not None


def test_a_logged_meal_survives_the_food_being_deleted(authed, app, custom_food, test_user):
    """Tidying up a custom food must never erase a diary entry."""
    with app.app_context():
        db.session.add(FoodLog(
            user_id=test_user.id,
            food_id=custom_food,
            food_name='Honey roasted peanuts',
            calories=150,
            protein_g=6,
            carbs_g=8,
            fat_g=12,
            meal_type='snack',
            date=date(2026, 10, 17),
        ))
        db.session.commit()

    response = authed.delete(f'/api/food/{custom_food}')

    assert response.status_code == 200
    assert response.get_json()['logs_kept'] == 1   # the UI reports this back

    with app.app_context():
        log = FoodLog.query.filter_by(user_id=test_user.id).first()
        assert log is not None
        assert log.food_name == 'Honey roasted peanuts'
        assert log.calories == 150          # the snapshot is untouched
        assert log.food_id is None          # just detached
