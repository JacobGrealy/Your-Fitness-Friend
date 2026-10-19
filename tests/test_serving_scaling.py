"""Totals follow the serving count (FF-0083).

The reported bug: changing Number of Servings in the edit form moved the count but left
the macros alone, so a 1-serving 170 kcal entry became "2 servings, 170 kcal". The three
write paths also disagreed about whether `food_logs.calories` was a total or a per-serving
value; the per-serving columns make it unambiguous and this checks the arithmetic keeps.
"""

import datetime

import pytest

from app import db
from app.models.food import Food
from app.models.food_log import FoodLog
from app.models.user import User


@pytest.fixture
def scenario(client, app):
    client.post('/api/auth/register', json={
        'email': 'serving@test.local', 'password': 'password123', 'name': 'Serving',
    })
    client.post('/api/auth/logout')
    client.post('/api/auth/login', json={
        'email': 'serving@test.local', 'password': 'password123',
    })
    with app.app_context():
        user = User.query.filter_by(email='serving@test.local').first()
        food = Food(
            user_id=user.id, name='Eggo french toaster sticks', brand='Eggo',
            calories=110, protein_g=3, carbs_g=20, fat_g=4,
            serving_size='2 slices (90 g)',
        )
        db.session.add(food)
        db.session.commit()
        return {'user_id': user.id, 'food_id': food.id}


def _create_log(client, food_id, servings=1):
    return client.post('/api/food/log', json={
        'food_id': food_id,
        'food_name': 'Eggo french toaster sticks',
        'calories': 110,
        'protein_g': 3, 'carbs_g': 20, 'fat_g': 4,
        'meal_type': 'breakfast',
        'date': datetime.date.today().isoformat(),
        'number_of_servings': servings,
    })


class TestChangingServingsRescalesTheTotals:
    def test_one_serving_logs_the_food_as_is(self, client, scenario):
        log_id = _create_log(client, scenario['food_id'], servings=1).get_json()['id']

        body = client.get(f'/api/food/log/{log_id}').get_json()

        assert body['calories'] == 110
        assert body['calories_per_serving'] == 110

    def test_doubling_the_servings_doubles_the_macros(self, client, scenario):
        log_id = _create_log(client, scenario['food_id'], servings=1).get_json()['id']

        response = client.put(f'/api/food/log/{log_id}', json={'number_of_servings': 2})

        body = response.get_json()
        assert body['calories'] == 220
        assert body['protein_g'] == 6
        assert body['carbs_g'] == 40
        assert body['fat_g'] == 8
        # the per-serving figure is the thing that did not change
        assert body['calories_per_serving'] == 110

    def test_a_fractional_serving_scales_down(self, client, scenario):
        """The reported case: half a serving is 55 kcal, not 110."""
        log_id = _create_log(client, scenario['food_id'], servings=1).get_json()['id']

        body = client.put(f'/api/food/log/{log_id}', json={'number_of_servings': 0.5}).get_json()

        assert body['calories'] == 55
        assert body['protein_g'] == 1.5

    def test_walking_the_count_back_and_forth_returns_to_the_start(self, client, scenario):
        log_id = _create_log(client, scenario['food_id'], servings=1).get_json()['id']

        client.put(f'/api/food/log/{log_id}', json={'number_of_servings': 2.5})
        body = client.put(f'/api/food/log/{log_id}', json={'number_of_servings': 1}).get_json()

        assert body['calories'] == 110

    def test_an_exact_decimal_is_kept_to_two_places(self, client, scenario):
        log_id = _create_log(client, scenario['food_id'], servings=1).get_json()['id']

        body = client.put(f'/api/food/log/{log_id}', json={'number_of_servings': 1.33}).get_json()

        assert body['calories_per_serving'] == 110
        assert round(body['calories'], 2) == 146        # 110 * 1.33 = 146.3
        assert round(body['protein_g'], 2) == 3.99


class TestEditingTheFoodChangesTheTotalsToo:
    def test_per_serving_edit_recomputes_the_total_at_the_current_count(self, client, scenario):
        """The FOOD screen: macros per serving, with the serving count left alone."""
        log_id = _create_log(client, scenario['food_id'], servings=2).get_json()['id']

        body = client.put(f'/api/food/log/{log_id}', json={
            'calories_per_serving': 120, 'protein_per_serving': 5,
            'carbs_per_serving': 22, 'fat_per_serving': 4,
        }).get_json()

        assert body['number_of_servings'] == 2          # unchanged
        assert body['calories'] == 240
        assert body['protein_g'] == 10

    def test_editing_the_food_updates_the_saved_food_for_future_logs(self, client, app, scenario):
        log_id = _create_log(client, scenario['food_id'], servings=1).get_json()['id']

        client.put(f'/api/food/log/{log_id}', json={'calories_per_serving': 120})

        with app.app_context():
            food = db.session.get(Food, scenario['food_id'])
            assert food.calories == 120

    def test_a_legacy_client_sending_only_totals_still_works(self, client, scenario):
        """Older bundles send calories + servings and no per-serving values."""
        log_id = _create_log(client, scenario['food_id'], servings=1).get_json()['id']

        body = client.put(f'/api/food/log/{log_id}', json={
            'calories': 200, 'protein_g': 9, 'carbs_g': 1, 'fat_g': 8,
        }).get_json()

        assert body['calories'] == 200
        assert body['calories_per_serving'] == 200
