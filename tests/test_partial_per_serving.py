"""A partial per-serving payload updates only what it names (FF-0093).

`_requested_per_serving` used to fill unsupplied macros with 0, so a request carrying
`protein_per_serving` alone silently zeroed calories, carbs and fat.
"""

import datetime

import pytest

from app.models.food_log import FoodLog

TODAY = datetime.date.today()


@pytest.fixture
def log_id(client, app):
    client.post('/api/auth/register', json={
        'email': 'partial@test.local', 'password': 'password123', 'name': 'Partial',
    })
    client.post('/api/auth/logout')
    client.post('/api/auth/login', json={
        'email': 'partial@test.local', 'password': 'password123',
    })
    response = client.post('/api/food/log', json={
        'food_name': 'Creamy Peanut Butter',
        'calories': 190, 'protein_g': 7, 'carbs_g': 8, 'fat_g': 16,
        'calories_per_serving': 190, 'protein_per_serving': 7,
        'carbs_per_serving': 8, 'fat_per_serving': 16,
        'meal_type': 'breakfast', 'date': TODAY.isoformat(), 'number_of_servings': 1,
    })
    return response.get_json()['id']


class TestPartialPerServingUpdate:
    def test_only_the_named_macro_changes(self, client, log_id):
        response = client.put(f'/api/food/log/{log_id}', json={
            'protein_per_serving': 9,
        })

        assert response.status_code == 200
        body = response.get_json()
        assert body['protein_g'] == 9
        # the reported bug: these used to become 0
        assert body['carbs_g'] == 8
        assert body['fat_g'] == 16
        assert body['calories'] == 190

    def test_all_four_still_replace_all_four(self, client, log_id):
        body = client.put(f'/api/food/log/{log_id}', json={
            'calories_per_serving': 100, 'protein_per_serving': 2,
            'carbs_per_serving': 3, 'fat_per_serving': 4,
        }).get_json()

        assert (body['calories'], body['protein_g'], body['carbs_g'], body['fat_g']) == (100, 2, 3, 4)

    def test_totals_still_work_as_the_older_contract(self, client, log_id):
        body = client.put(f'/api/food/log/{log_id}', json={
            'food_name': 'Creamy Peanut Butter',
            'calories': 380, 'protein_g': 14, 'carbs_g': 16, 'fat_g': 32,
            'number_of_servings': 2,
        }).get_json()

        assert body['calories'] == 380
        assert body['protein_g'] == 14
        assert body['calories_per_serving'] == 190

    def test_a_partial_update_scales_with_the_serving_count(self, client, log_id):
        client.put(f'/api/food/log/{log_id}', json={'number_of_servings': 2})
        body = client.put(f'/api/food/log/{log_id}', json={'protein_per_serving': 10}).get_json()

        # two servings of a 10 g protein food is 20 g, and nothing else was disturbed
        assert body['protein_g'] == 20
        assert body['carbs_g'] == 16
        assert body['fat_g'] == 32

    def test_a_payload_with_no_nutrition_changes_nothing(self, client, log_id):
        body = client.put(f'/api/food/log/{log_id}', json={
            'food_name': 'Renamed only',
        }).get_json()

        assert body['food_name'] == 'Renamed only'
        assert body['protein_g'] == 7
        assert body['carbs_g'] == 8
