"""Barcode lookup: local foods first, OpenFoodFacts second (FF-0014).

Nothing here touches the network: `openfoodfacts.lookup_barcode` is replaced per
test. A real lookup in the suite would make it slow, flaky and dependent on a
third party being up.
"""

import pytest

from app import create_app, db
from app.models.food import Food
from app.utils import openfoodfacts


@pytest.fixture
def app():
    application = create_app('testing')
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth(app, client):
    client.post('/api/auth/register', json={
        'email': 'barcode@example.test',
        'password': 'barcode-test-1',
        'name': 'Barcode',
    })
    yield client
    client.post('/api/auth/logout')


NUTELLA = {
    'status': 1,
    'code': '3017620422003',
    'product': {
        'product_name': 'Nutella',
        'brands': 'Ferrero, Nutella',
        'serving_size': '15 g',
        'nutriments': {
            'energy-kcal_100g': 539,
            'proteins_100g': 6.3,
            'carbohydrates_100g': 57.5,
            'fat_100g': 30.9,
        },
    },
}


def test_local_food_wins_and_skips_the_network(auth, app, monkeypatch):
    called = []

    def explode(*args, **kwargs):
        called.append(args)
        raise AssertionError('the network must not be used when the food is local')

    monkeypatch.setattr(openfoodfacts, 'lookup_barcode', explode)

    with app.app_context():
        from app.models.user import User
        user = User.query.filter_by(email='barcode@example.test').first()
        db.session.add(Food(user_id=user.id, name='My Protein Bar', calories=210,
                            barcode_id='012345678905'))
        db.session.commit()

    response = auth.get('/api/food/barcode/012345678905')

    assert response.status_code == 200
    body = response.get_json()
    assert body['source'] == 'local'
    assert body['food']['name'] == 'My Protein Bar'
    assert called == []


def test_remote_hit_is_saved_as_a_food(auth, app, monkeypatch):
    monkeypatch.setattr(openfoodfacts, 'lookup_barcode', lambda code, **kw: {
        'name': 'Nutella',
        'brand': 'Ferrero',
        'calories': 539,
        'protein_g': 6.3,
        'carbs_g': 57.5,
        'fat_g': 30.9,
        'serving_size': '15 g',
    })

    response = auth.get('/api/food/barcode/3017620422003')

    assert response.status_code == 200
    body = response.get_json()
    assert body['source'] == 'openfoodfacts'
    assert body['food']['calories'] == 539
    assert body['food']['barcode_id'] == '3017620422003'

    with app.app_context():
        saved = Food.query.filter_by(barcode_id='3017620422003').one()
        assert saved.name == 'Nutella'
        assert saved.brand == 'Ferrero'


def test_second_scan_of_the_same_product_is_local(auth, monkeypatch):
    monkeypatch.setattr(openfoodfacts, 'lookup_barcode', lambda code, **kw: {
        'name': 'Nutella', 'brand': 'Ferrero', 'calories': 539,
        'protein_g': 6.3, 'carbs_g': 57.5, 'fat_g': 30.9, 'serving_size': '15 g',
    })

    first = auth.get('/api/food/barcode/3017620422003').get_json()
    second = auth.get('/api/food/barcode/3017620422003').get_json()

    assert first['source'] == 'openfoodfacts'
    assert second['source'] == 'local'
    assert second['food']['id'] == first['food']['id']


def test_unknown_barcode_is_a_404(auth, monkeypatch):
    monkeypatch.setattr(openfoodfacts, 'lookup_barcode', lambda code, **kw: None)

    response = auth.get('/api/food/barcode/0000000000000')

    assert response.status_code == 404
    assert 'No product' in response.get_json()['error']


def test_lookup_service_down_is_503_not_500(auth, monkeypatch):
    def offline(code, **kwargs):
        raise openfoodfacts.OpenFoodFactsUnavailable('timed out')

    monkeypatch.setattr(openfoodfacts, 'lookup_barcode', offline)

    response = auth.get('/api/food/barcode/3017620422003')

    assert response.status_code == 503
    assert response.get_json()['barcode'] == '3017620422003'


def test_non_numeric_barcode_is_rejected(auth):
    response = auth.get('/api/food/barcode/not-a-barcode')
    assert response.status_code == 400


def test_requires_login(client):
    response = client.get('/api/food/barcode/3017620422003')
    assert response.status_code == 401


# --- the client's own parsing, without a socket ---------------------------

def test_parse_product_maps_macros_and_brand():
    parsed = openfoodfacts.parse_product(NUTELLA)

    assert parsed == {
        'name': 'Nutella',
        'brand': 'Ferrero',          # first brand only
        'calories': 539,
        'protein_g': 6.3,
        'carbs_g': 57.5,
        'fat_g': 30.9,
        'serving_size': '15 g',
    }


def test_parse_product_converts_kilojoules_when_kcal_is_absent():
    payload = {
        'status': 1,
        'product': {
            'product_name': 'Flat Coke',
            'nutriments': {'energy_100g': 180, 'protein_100g': 0},
        },
    }

    assert openfoodfacts.parse_product(payload)['calories'] == 43


def test_parse_product_rejects_a_product_with_no_energy_data():
    payload = {'status': 1, 'product': {'product_name': 'Mystery Snack', 'nutriments': {}}}
    assert openfoodfacts.parse_product(payload) is None


def test_parse_product_rejects_a_missing_product():
    assert openfoodfacts.parse_product({'status': 0}) is None
    assert openfoodfacts.parse_product({'status': 1}) is None


def test_normalise_code_accepts_common_lengths_and_rejects_junk():
    assert openfoodfacts.normalise_code(' 012345678905 ') == '012345678905'
    assert openfoodfacts.normalise_code('123-456') == '123456'
    assert openfoodfacts.normalise_code('12345') is None          # too short
    assert openfoodfacts.normalise_code('123456789012345') is None  # too long
    assert openfoodfacts.normalise_code('12AB56') is None
    assert openfoodfacts.normalise_code(None) is None
