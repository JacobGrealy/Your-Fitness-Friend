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


@pytest.mark.parametrize('photo_code,duplicate_code', [
    ('016000507920', '0016000507920'),
    ('0016000507920', '016000507920'),
])
def test_own_photo_food_wins_across_all_equivalent_local_codes(auth, app, monkeypatch, photo_code, duplicate_code):
    def no_network(*args, **kwargs):
        raise AssertionError('Any equivalent local match must prevent remote lookup')
    monkeypatch.setattr(openfoodfacts, 'lookup_barcode', no_network)
    with app.app_context():
        from app.models.user import User
        user = User.query.filter_by(email='barcode@example.test').one()
        # Insert the plain cached record first: neither insertion nor variant order
        # may displace the owner's photo-bearing saved food (FF-0132).
        db.session.add(Food(user_id=user.id, name='Remote cached duplicate', calories=70, barcode_id=duplicate_code))
        preferred = Food(user_id=user.id, name='My Fiber One Bar', calories=70,
                         barcode_id=photo_code, photo_url='food_log_photos/bar.jpg', serving_size='1 bar')
        db.session.add(preferred); db.session.commit()
        preferred_id = preferred.id
    for scanned in ('016000507920', '0016000507920'):
        response = auth.get('/api/food/barcode/' + scanned)
        assert response.status_code == 200
        assert response.json['source'] == 'local'
        assert response.json['food']['id'] == preferred_id
        assert response.json['food']['photo_url'] == 'food_log_photos/bar.jpg'
        assert response.json['food']['serving_size'] == '1 bar'
    with app.app_context():
        assert Food.query.count() == 2


def test_own_upc_food_wins_over_shared_canonical_photo(auth, app, monkeypatch):
    monkeypatch.setattr(openfoodfacts, 'lookup_barcode', lambda *args: pytest.fail('Network must not run'))
    with app.app_context():
        from app.models.user import User
        user = User.query.filter_by(email='barcode@example.test').one()
        db.session.add(Food(name='Shared EAN food', calories=70, barcode_id='0016000507920', photo_url='public.jpg'))
        own = Food(user_id=user.id, name='Own UPC food', calories=70, barcode_id='016000507920')
        db.session.add(own); db.session.commit()
        own_id = own.id
    assert auth.get('/api/food/barcode/0016000507920').json['food']['id'] == own_id


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

    # The nutriments are per 100 g and the serving is 15 g, so one serving is
    # 539 * 0.15 = 81 kcal. Reporting 539 was the FF-0063 bug.
    assert parsed == {
        'name': 'Nutella',
        'brand': 'Ferrero',          # first brand only
        'calories': 81,
        'protein_g': 0.9,
        'carbs_g': 8.6,
        'fat_g': 4.6,
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


# --- UPC-A / EAN-13 equivalence (FF-0060) ---------------------------------------
#
# A UPC-A is an EAN-13 with a leading zero, and ZXing reports a leading-zero
# EAN-13 as UPC-A. So the same shelf item reaches the server as 12 digits or 13
# depending on which symbology the decoder matched, and both must find one product.


def test_upc_a_and_ean_13_find_the_same_cached_product(auth, app, monkeypatch):
    calls = []

    def fake_lookup(code):
        calls.append(code)
        return openfoodfacts.parse_product(NUTELLA)

    monkeypatch.setattr(openfoodfacts, 'lookup_barcode', fake_lookup)

    # Scanned as UPC-A (12 digits): cached under the canonical 13-digit form.
    first = auth.get('/api/food/barcode/301762042200')
    assert first.status_code == 200
    assert calls == ['0301762042200']  # the 13-digit form was queried

    with app.app_context():
        stored = Food.query.filter_by(barcode_id='0301762042200').first()
        assert stored is not None

    # Scanning the EAN-13 form then hits the cache instead of the network.
    calls.clear()
    second = auth.get('/api/food/barcode/0301762042200')
    assert second.status_code == 200
    assert second.get_json()['source'] == 'local'
    assert calls == []


def test_ean_13_scan_finds_a_product_cached_under_its_upc_a(auth, app, monkeypatch):
    """Rows written before canonicalisation used the raw 12-digit code."""
    with app.app_context():
        from app.models.user import User

        user = User.query.filter_by(email='barcode@example.test').first()
        app.config['TESTING'] = True
        db.session.add(Food(
            user_id=user.id,
            name='Legacy Granola',
            calories=120,
            protein_g=3,
            carbs_g=20,
            fat_g=4,
            barcode_id='041570000000',
        ))
        db.session.commit()

    monkeypatch.setattr(openfoodfacts, 'lookup_barcode', lambda code: pytest.fail('should not hit the network'))

    response = auth.get('/api/food/barcode/0041570000000')

    assert response.status_code == 200
    assert response.get_json()['food']['name'] == 'Legacy Granola'


def test_canonical_code_helper():
    from app.routes.barcode_lookup import canonical_code, code_variants

    assert canonical_code('123456789012') == '0123456789012'
    assert canonical_code('0123456789012') == '0123456789012'
    assert canonical_code('40170725') == '40170725'  # EAN-8 stays as it is
    assert code_variants('123456789012') == ['0123456789012', '123456789012']
    assert code_variants('3017620422003') == ['3017620422003']


# --- per-serving vs per-100g (FF-0063) ------------------------------------------
#
# OpenFoodFacts publishes per-100g nutriments. Treating those as one serving made a
# 25 g portion read as four times its calories - the owner's report.


def _product(**overrides):
    base = {
        'status': 1,
        'code': '4000000000000',
        'product': {
            'product_name': 'Test Bar',
            'brands': 'Test',
            'nutriments': {
                'energy-kcal_100g': 400,
                'proteins_100g': 10,
                'carbohydrates_100g': 40,
                'fat_100g': 20,
            },
        },
    }
    base['product'].update(overrides)
    return base


def test_quarter_serving_is_not_four_times_the_calories():
    """The reported bug: a 25 g serving shown as the full 100 g values."""
    parsed = openfoodfacts.parse_product(_product(serving_size='25 g'))

    assert parsed['calories'] == 100        # 400 * 0.25, not 400
    assert parsed['protein_g'] == 2.5
    assert parsed['carbs_g'] == 10.0
    assert parsed['fat_g'] == 5.0
    assert parsed['serving_size'] == '25 g'


def test_serving_quantity_is_preferred_over_the_label():
    parsed = openfoodfacts.parse_product(
        _product(serving_size='1 bar', serving_quantity=50)
    )
    assert parsed['calories'] == 200


def test_mass_units_are_understood():
    assert openfoodfacts.serving_mass_g({'serving_size': '1.5 oz'}) == pytest.approx(42.52, abs=0.01)
    assert openfoodfacts.serving_mass_g({'serving_size': '250ml'}) == pytest.approx(250)
    assert openfoodfacts.serving_mass_g({'serving_size': ' 30G '}) == pytest.approx(30)


def test_immeasurable_serving_keeps_per_100g_numbers_and_says_so():
    """"1 cup" cannot be converted without inventing a density, so the label moves."""
    parsed = openfoodfacts.parse_product(_product(serving_size='1 cup'))

    assert parsed['calories'] == 400
    assert parsed['serving_size'] == '100 g'


def test_no_serving_data_at_all_stays_per_100g():
    parsed = openfoodfacts.parse_product(_product())
    assert parsed['calories'] == 400
    assert parsed['serving_size'] == '100 g'


def test_kilojoules_are_converted_and_then_scaled():
    parsed = openfoodfacts.parse_product(_product(
        serving_size='50 g',
        nutriments={'energy_100g': 1674, 'proteins_100g': 10, 'carbohydrates_100g': 40, 'fat_100g': 20},
    ))
    # 1674 kJ / 4.184 = 400 kcal per 100 g, halved for a 50 g serving
    assert parsed['calories'] == 200


def test_published_per_serving_values_win_over_arithmetic():
    """OFF computes the serving itself; prefer its figure to ours.

    Real numbers from 0038000138416 (Original Potato Crisps): 536 kcal/100 g and
    152 kcal per 28.349 g portion. Scaling gives 152.0 too, but OFF's own value
    needs no assumption about rounding.
    """
    parsed = openfoodfacts.parse_product({
        'status': 1,
        'product': {
            'product_name': 'Original Potato Crisps',
            'serving_size': '1 portion (28.349 g)',
            'serving_quantity': 28.349,
            'nutriments': {
                'energy-kcal_100g': 536,
                'energy-kcal_serving': 152,
                'proteins_serving': 1.0,
                'carbohydrates_serving': 16.2,
                'fat_serving': 9.1,
            },
        },
    })

    assert parsed['calories'] == 152
    assert parsed['protein_g'] == 1.0
    assert parsed['carbs_g'] == 16.2
    assert parsed['fat_g'] == 9.1
    assert parsed['serving_size'] == '1 portion (28.349 g)'


def test_a_product_without_serving_data_is_labelled_per_100g():
    """Nutella really does publish no serving size; the number must match the label."""
    parsed = openfoodfacts.parse_product({
        'status': 1,
        'product': {
            'product_name': 'Nutella',
            'nutriments': {'energy-kcal_100g': 539, 'proteins_100g': 6.3,
                           'carbohydrates_100g': 57.5, 'fat_100g': 30.9},
        },
    })

    assert parsed['calories'] == 539
    assert parsed['serving_size'] == '100 g'
