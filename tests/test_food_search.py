import io
import json
import urllib.error
import pytest
from app.utils import food_search
from app.models.food import Food

PRODUCT = {'code': '1234567890123', 'product_name': 'Apple', 'brands': 'Orchard',
    'nutrition_data_per': '100g', 'nutriments': {'energy-kcal_100g': 52,
    'proteins_100g': .3, 'carbohydrates_100g': 14, 'fat_100g': .2}}


@pytest.fixture
def search_client(client, app, tmp_path, monkeypatch):
    app.config['OFF_SEARCH_CACHE_PATH'] = str(tmp_path / 'off.sqlite')
    monkeypatch.setattr(food_search, 'fetch_products', lambda q, p: {'products': [PRODUCT]})
    client.post('/api/auth/register', json={'email': 'search@test.local', 'password': 'password123', 'name': 'Search'})
    client.post('/api/auth/login', json={'email': 'search@test.local', 'password': 'password123'})
    return client


def test_search_requires_auth(client):
    assert client.get('/api/food/search/openfoodfacts?q=apple').status_code == 401


def test_reference_requires_macros_not_fake_zero():
    assert food_search.parse_reference(PRODUCT)['serving_amount'] == 100
    incomplete = {**PRODUCT, 'nutriments': {'energy-kcal_100g': 52, 'proteins_100g': .3}}
    assert food_search.parse_reference(incomplete) is None
    liquid = {**PRODUCT, 'serving_size': '250 ml'}
    assert food_search.parse_reference(liquid)['serving_unit'] == 'ml'
    bad = {**PRODUCT, 'nutriments': {**PRODUCT['nutriments'], 'proteins_100g': float('nan')}}
    assert food_search.parse_reference(bad) is None


def test_cache_throttle_and_validation(search_client, monkeypatch):
    client = search_client
    calls = []
    monkeypatch.setattr(food_search, 'fetch_products', lambda q, p: calls.append(q) or {'products': [PRODUCT]})
    first = client.get('/api/food/search/openfoodfacts?q=apple')
    assert first.status_code == 200
    assert first.json['results'][0]['serving_size'] == '100 g'
    assert first.json['stale'] is False
    assert client.get('/api/food/search/openfoodfacts?q=APPLE').status_code == 200
    assert calls == ['apple']
    assert client.get('/api/food/search/openfoodfacts?q=grapes').status_code == 429
    assert client.get('/api/food/search/openfoodfacts?q=a').status_code == 400
    assert client.get('/api/food/search/openfoodfacts?q=apple&page=11').status_code == 400
    assert client.get('/api/food').json == []  # browsing creates nothing


def test_provider_failure(search_client, monkeypatch):
    def fail(*args):
        raise food_search.SearchUnavailable('offline')
    monkeypatch.setattr(food_search, 'fetch_products', fail)
    assert search_client.get('/api/food/search/openfoodfacts?q=apple').status_code == 503
    assert search_client.get('/api/food').status_code == 200


def test_import_only_when_logging_and_dedup(search_client):
    client = search_client
    token = client.get('/api/food/search/openfoodfacts?q=apple').json['results'][0]['token']
    data = {'external_food_token': token, 'food_name': 'Apple', 'calories': 52,
        'amount': 182, 'unit': 'g', 'date': '2026-10-19', 'meal_type': 'lunch'}
    result = client.post('/api/food/log', json=data)
    assert result.status_code == 201, result.json
    assert result.json['calories'] == 95
    assert result.json['carbs_g'] == pytest.approx(25.48)
    assert len(client.get('/api/food').json) == 1
    second = client.post('/api/food/log', json={**data, 'amount': 200})
    assert second.json['food_id'] == result.json['food_id']
    assert second.json['calories'] == 104
    assert len(client.get('/api/food').json) == 1
    assert client.get('/api/food').json[0]['calories'] == 52


def test_invalid_log_does_not_leave_import(search_client):
    client = search_client
    token = client.get('/api/food/search/openfoodfacts?q=apple').json['results'][0]['token']
    response = client.post('/api/food/log', json={'external_food_token': token,
        'food_name': 'Apple', 'calories': 52, 'amount': 1, 'unit': 'cup',
        'date': '2026-10-19', 'meal_type': 'lunch'})
    assert response.status_code == 400
    assert client.get('/api/food').json == []
    assert client.post('/api/food/log', json={'external_food_token':'tampered',
        'food_name':'Apple','calories':52,'date':'2026-10-19','meal_type':'lunch'}).status_code == 400


class _FakeHTTP503(urllib.error.HTTPError):
    def __init__(self):
        super().__init__(food_search.SEARCH_URL, 503, 'Service Temporarily Unavailable', {}, None)


def test_transient_503_is_retried(monkeypatch):
    """OFF answers the identical query with 503 about half the time (measured live)."""
    calls = []

    def flaky_urlopen(request, timeout=None):
        calls.append(1)
        if len(calls) < 3:
            raise _FakeHTTP503()
        return io.BytesIO(json.dumps({'products': [PRODUCT]}).encode())

    # patch urlopen, not _query_once: this exercises the real HTTPError classification
    monkeypatch.setattr(food_search.urllib.request, 'urlopen', flaky_urlopen)
    monkeypatch.setattr(food_search.time, 'sleep', lambda seconds: None)

    payload = food_search.fetch_products('apple', 1)

    assert payload['products'][0]['product_name'] == 'Apple'
    assert len(calls) == 3


def test_html_instead_of_json_is_retried(monkeypatch):
    """A 200 carrying the "temporarily unavailable" HTML page is the same transient fault."""
    responses = [ValueError('Expecting value'), {'products': []}]

    def once(query, page, timeout):
        item = responses.pop(0)
        if isinstance(item, Exception):
            raise food_search._Retryable('provider sent HTML instead of JSON')
        return item

    monkeypatch.setattr(food_search, '_query_once', once)
    monkeypatch.setattr(food_search.time, 'sleep', lambda seconds: None)

    assert food_search.fetch_products('apple', 1) == {'products': []}


def test_gives_up_after_bounded_attempts(monkeypatch):
    attempts = []

    def always_fail(query, page, timeout):
        attempts.append(1)
        raise food_search._Retryable('provider returned 503')

    monkeypatch.setattr(food_search, '_query_once', always_fail)
    monkeypatch.setattr(food_search.time, 'sleep', lambda seconds: None)

    with pytest.raises(food_search.SearchUnavailable):
        food_search.fetch_products('apple', 1)

    assert len(attempts) == food_search.SEARCH_ATTEMPTS == 4


def test_non_retryable_client_error_fails_immediately(monkeypatch):
    calls = []

    def rejected(query, page, timeout):
        calls.append(1)
        raise food_search.SearchUnavailable('provider rejected the search (400)')

    monkeypatch.setattr(food_search, '_query_once', rejected)

    with pytest.raises(food_search.SearchUnavailable):
        food_search.fetch_products('apple', 1)

    assert len(calls) == 1


def test_provider_outage_serves_a_previous_result_marked_stale(search_client, monkeypatch):
    """A cached answer beats an error while OFF's search is down (FF-0098)."""
    client = search_client
    monkeypatch.setattr(food_search, 'fetch_products', lambda q, p: {'products': [PRODUCT]})
    assert client.get('/api/food/search/openfoodfacts?q=apple').json['stale'] is False

    # expire the fresh copy, then take the provider away
    import sqlite3, time as clock
    cache = client.application.config['OFF_SEARCH_CACHE_PATH']
    with sqlite3.connect(cache) as conn:
        conn.execute('UPDATE cache SET expires=?', (clock.time() - 60,))
        conn.execute('UPDATE throttle SET requested=?', (0,))

    def down(*args):
        raise food_search.SearchUnavailable('provider is down')
    monkeypatch.setattr(food_search, 'fetch_products', down)

    response = client.get('/api/food/search/openfoodfacts?q=apple')
    assert response.status_code == 200
    assert response.json['stale'] is True
    assert response.json['results'][0]['name'] == 'Apple'

    # a query never seen before still reports the outage honestly (throttle cleared so
    # this exercises the outage path rather than the rate limit)
    with sqlite3.connect(cache) as conn:
        conn.execute('UPDATE throttle SET requested=?', (0,))
    assert client.get('/api/food/search/openfoodfacts?q=grapes').status_code == 503
