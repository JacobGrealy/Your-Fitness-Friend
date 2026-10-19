"""USDA FoodData Central search and its provider dispatch (FF-0099)."""

import pytest

from app.utils import food_search, usda

FOOD = {
    'fdcId': 2346397,
    'description': 'Apples, fuji, with skin, raw',
    'dataType': 'Foundation',
    'foodNutrients': [
        {'nutrientName': 'Energy', 'value': 218, 'unitName': 'kJ'},
        {'nutrientName': 'Protein', 'value': 0.26, 'unitName': 'G'},
        {'nutrientName': 'Carbohydrate, by difference', 'value': 15.2, 'unitName': 'G'},
        {'nutrientName': 'Total lipid (fat)', 'value': 0.17, 'unitName': 'G'},
    ],
}


def test_energy_is_converted_from_kilojoules():
    reference = usda.parse_food(FOOD)
    assert reference['calories'] == 52          # 218 kJ / 4.184
    assert reference['serving_amount'] == 100
    assert reference['serving_unit'] == 'g'
    assert reference['external_id'] == 'usda:2346397'
    assert reference['source'] == 'usda'


def test_energy_is_found_under_every_dataset_name():
    food = {**FOOD, 'foodNutrients': [
        {'nutrientName': 'Energy (Atwater General Factors)', 'value': 52, 'unitName': 'KCAL'},
        {'nutrientName': 'Protein', 'value': 0.26, 'unitName': 'G'},
        {'nutrientName': 'Carbohydrate, by difference', 'value': 15.2, 'unitName': 'G'},
        {'nutrientName': 'Total lipid (fat)', 'value': 0.17, 'unitName': 'G'},
    ]}
    assert usda.parse_food(food)['calories'] == 52


@pytest.mark.parametrize('missing', ['Energy', 'Protein', 'Carbohydrate, by difference', 'Total lipid (fat)'])
def test_incomplete_foods_are_omitted_rather_than_zeroed(missing):
    food = {**FOOD, 'foodNutrients': [n for n in FOOD['foodNutrients'] if n['nutrientName'] != missing]}
    assert usda.parse_food(food) is None


def test_unusable_values_are_rejected():
    assert usda.parse_food({**FOOD, 'description': ''}) is None
    assert usda.parse_food({'description': 'No id'}) is None
    zeroed = {**FOOD, 'foodNutrients': [
        {'nutrientName': 'Energy', 'value': 0, 'unitName': 'KCAL'}] + FOOD['foodNutrients'][1:]}
    assert usda.parse_food(zeroed) is None


def test_ranking_puts_the_plain_food_first():
    foods = [
        {'description': 'Croissants, apple', 'dataType': 'SR Legacy'},
        {'description': 'Babyfood, juice, apple', 'dataType': 'SR Legacy'},
        {'description': 'Apples, fuji, with skin, raw', 'dataType': 'Foundation'},
        {'description': 'Apples, dried, sulfured, uncooked', 'dataType': 'SR Legacy'},
    ]
    ranked = usda.rank_foods('apple', foods)
    assert ranked[0]['description'] == 'Apples, fuji, with skin, raw'
    # dishes that merely contain the word come after foods whose name starts with it
    assert ranked[1]['description'] == 'Apples, dried, sulfured, uncooked'
    assert {f['description'] for f in ranked[2:]} == {
        'Croissants, apple', 'Babyfood, juice, apple'}


class TestProviderDispatch:
    def test_off_is_used_when_no_key_is_configured(self, app):
        with app.app_context():
            assert food_search.active_provider() == 'openfoodfacts'

    def test_usda_is_used_once_a_key_is_configured(self, app):
        app.config['USDA_FDC_API_KEY'] = 'test-key'
        with app.app_context():
            assert food_search.active_provider() == 'usda'

    def test_blank_key_does_not_count(self, app):
        app.config['USDA_FDC_API_KEY'] = '   '
        with app.app_context():
            assert food_search.active_provider() == 'openfoodfacts'


@pytest.fixture
def usda_client(client, app, monkeypatch):
    app.config['USDA_FDC_API_KEY'] = 'test-key'
    monkeypatch.setattr(usda, 'search', lambda q, p, k, timeout=8: {
        'foods': [FOOD, {'description': 'Croissants, apple', 'dataType': 'SR Legacy',
                         'fdcId': 1, 'foodNutrients': FOOD['foodNutrients']}]})
    client.post('/api/auth/register', json={
        'email': 'usda@test.local', 'password': 'password123', 'name': 'Usda'})
    client.post('/api/auth/login', json={'email': 'usda@test.local', 'password': 'password123'})
    return client


def test_search_returns_usda_references(usda_client):
    response = usda_client.get('/api/food/search/openfoodfacts?q=apple')
    assert response.status_code == 200, response.json
    body = response.json
    assert body['source'] == 'usda'
    assert body['results'][0]['external_id'] == 'usda:2346397'
    assert body['results'][0]['name'] == 'Apples, fuji, with skin, raw'
    assert all(result['token'] for result in body['results'])


def test_logging_a_usda_food_imports_it_once_and_scales_by_weight(usda_client):
    client = usda_client
    token = client.get('/api/food/search/openfoodfacts?q=apple').json['results'][0]['token']
    payload = {'external_food_token': token, 'food_name': 'Apples, fuji',
               'calories': 52, 'amount': 182, 'unit': 'g',
               'date': '2026-10-19', 'meal_type': 'lunch'}

    first = client.post('/api/food/log', json=payload)
    assert first.status_code == 201, first.json
    assert first.json['calories'] == 95
    assert first.json['number_of_servings'] == pytest.approx(1.82)

    second = client.post('/api/food/log', json={**payload, 'amount': 100})
    assert second.json['food_id'] == first.json['food_id']

    foods = client.get('/api/food').json
    assert len(foods) == 1
    assert foods[0]['external_id'] == 'usda:2346397'
    assert foods[0]['calories'] == 52        # reference kept, not the eaten total


def test_usda_outage_is_reported_and_saves_nothing(usda_client, monkeypatch):
    def down(*args, **kwargs):
        raise usda.UsdaUnavailable('USDA returned 503')
    monkeypatch.setattr(usda, 'search', down)

    response = usda_client.get('/api/food/search/openfoodfacts?q=apple')
    assert response.status_code == 503
    assert 'saved foods still work' in response.json['error']
    assert usda_client.get('/api/food').json == []


def test_dataset_is_not_stored_as_a_brand(usda_client):
    """USDA has no brands; "Foundation" is the dataset and must not masquerade as one."""
    client = usda_client
    token = client.get('/api/food/search/openfoodfacts?q=apple').json['results'][0]['token']
    client.post('/api/food/log', json={'external_food_token': token, 'food_name': 'Apples',
        'calories': 52, 'amount': 100, 'unit': 'g', 'date': '2026-10-19', 'meal_type': 'lunch'})

    imported = client.get('/api/food').json[0]
    assert imported['brand'] is None
    assert imported['external_id'] == 'usda:2346397'
