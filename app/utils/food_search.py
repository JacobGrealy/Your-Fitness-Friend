"""Open Food Facts text search, normalized reference snapshots and a cross-worker cache.

Search is explicitly submitted, never keystroke-driven. SQLite's write lock reserves a
provider request across gunicorn workers; one outbound search per 6.1 seconds is below
OFF's ten-search/minute IP limit. Cache stores public product data only.
"""
import json
import math
import os
import re
import sqlite3
import tempfile
import time
import urllib.parse
import urllib.request
import urllib.error

from flask import current_app
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from app.utils.openfoodfacts import USER_AGENT, normalise_code, _first_name

SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
TTL = 3600
STALE_TTL = 7 * 24 * 3600
SEARCH_PAGE_SIZE = 20
# Three attempts: with the provider's observed ~50% transient failure rate, one attempt
# fails too often to be usable and three fail about 1 time in 8.
SEARCH_ATTEMPTS = 4
SEARCH_RETRY_DELAYS = (0.8, 1.5, 3.0)
SEARCH_TIMEOUT = 8


class SearchUnavailable(Exception):
    pass


class _Retryable(Exception):
    """A provider failure worth another attempt: 5xx, 429, HTML instead of JSON, socket."""


class SearchLimited(Exception):
    pass


def parse_reference(product):
    """Require actual per-100-unit values, not inferred zeros or per-serving values."""
    if not isinstance(product, dict):
        return None
    code = normalise_code(product.get('code'))
    name = _first_name(product)
    nutrients = product.get('nutriments')
    if not code or not name or not isinstance(nutrients, dict):
        return None
    values = {}
    try:
        energy = nutrients.get('energy-kcal_100g')
        if energy is None:
            energy = float(nutrients['energy_100g']) / 4.184
        values['calories'] = float(energy)
        for key, field in [('protein_g', 'proteins_100g'), ('carbs_g', 'carbohydrates_100g'), ('fat_g', 'fat_100g')]:
            values[key] = float(nutrients[field])
        if any(not math.isfinite(v) or v < 0 for v in values.values()) or values['calories'] <= 0:
            return None
    except (KeyError, TypeError, ValueError, OverflowError):
        return None
    # OFF uses _100g keys for 100ml too. Respect an explicit liquid label rather than
    # declaring ml to weigh one gram. Never offer mass/volume cross-conversion.
    declared = str(product.get('nutrition_data_per') or '')
    label = str(product.get('serving_size') or '').lower()
    liquid = declared == '100ml' or bool(re.search(r'\d\s*(ml|cl|l)\b', label))
    unit = 'ml' if liquid else 'g'
    return {
        'name': name[:120], 'brand': str(product.get('brands') or '').split(',')[0].strip()[:100] or None,
        **values, 'calories': max(1, round(values['calories'])),
        'serving_amount': 100, 'serving_unit': unit, 'serving_size': f'100 {unit}',
        'barcode_id': ('0' + code) if len(code) == 12 else code,
        'external_id': 'openfoodfacts:' + (('0' + code) if len(code) == 12 else code),
        'source': 'openfoodfacts',
    }


def _query_once(query, page, timeout):
    """One attempt. Raises _Retryable for a transient failure, SearchUnavailable when permanent."""
    params = urllib.parse.urlencode({'search_terms': query, 'search_simple': 1,
        'action': 'process', 'json': 1, 'page_size': SEARCH_PAGE_SIZE, 'page': page,
        'fields': 'code,product_name,product_name_en,generic_name,brands,nutriments,serving_size,nutrition_data_per'})
    request = urllib.request.Request(SEARCH_URL + '?' + params, headers={'User-Agent': USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        # OFF answers 503 with an HTML "Page temporarily unavailable" page. It is
        # transient: the identical request succeeds seconds later. Retry it.
        if exc.code == 429 or exc.code >= 500:
            raise _Retryable(f'provider returned {exc.code}') from exc
        raise SearchUnavailable(f'provider rejected the search ({exc.code})') from exc
    except (ValueError, json.JSONDecodeError) as exc:
        # A 200 carrying HTML instead of JSON is the same transient page.
        raise _Retryable('provider sent HTML instead of JSON') from exc
    except (OSError, urllib.error.URLError) as exc:
        raise _Retryable(str(exc)) from exc

    if not isinstance(payload, dict) or not isinstance(payload.get('products'), list):
        raise _Retryable('provider payload was not a search result')
    return payload


def fetch_products(query, page, attempts=SEARCH_ATTEMPTS, timeout=SEARCH_TIMEOUT):
    """Search OFF, retrying the transient failures it is prone to.

    Measured against the live service: the same query alternates between a real JSON
    result and a 503 "temporarily unavailable" page, roughly half the time each, while
    the product (barcode) API stays healthy. One attempt therefore fails for the user
    about half the time, which is what "Open Food Facts is not available" was.
    """
    last = None
    for attempt in range(max(1, attempts)):
        try:
            return _query_once(query, page, timeout)
        except _Retryable as exc:
            last = exc
            if attempt + 1 < attempts:
                time.sleep(SEARCH_RETRY_DELAYS[min(attempt, len(SEARCH_RETRY_DELAYS) - 1)])
    raise SearchUnavailable(
        'Open Food Facts is busy right now. Your saved foods still work — try Search again in a moment.'
    ) from last


def cached_products(query, page):
    path = current_app.config.get('OFF_SEARCH_CACHE_PATH') or os.path.join(
        tempfile.gettempdir(), 'awefit-off-search-v1.sqlite3')
    now = time.time()
    key = json.dumps([query.casefold(), page])
    with sqlite3.connect(path, timeout=3) as conn:
        conn.execute('CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT, expires REAL)')
        conn.execute('CREATE TABLE IF NOT EXISTS throttle (id INTEGER PRIMARY KEY, requested REAL)')
        conn.commit()
        conn.execute('BEGIN IMMEDIATE')
        # Expired rows are kept for a while: when the provider is down, an hour-old
        # result is far better than an error (FF-0098).
        conn.execute('DELETE FROM cache WHERE expires < ?', (now - STALE_TTL,))
        hit = conn.execute('SELECT value, expires FROM cache WHERE key=?', (key,)).fetchone()
        if hit and hit[1] > now:
            return json.loads(hit[0]), False
        last = conn.execute('SELECT requested FROM throttle WHERE id=1').fetchone()
        if last and now - last[0] < 6.1:
            raise SearchLimited('Please wait a few seconds before searching Open Food Facts again.')
        conn.execute('INSERT OR REPLACE INTO throttle VALUES (1, ?)', (now,))

    try:
        payload = fetch_products(query, page)
    except SearchUnavailable:
        # The provider's search is frequently unavailable (measured: ~1 request in 5
        # succeeds). A previously cached answer still helps, clearly marked as stale.
        if hit:
            current_app.logger.info('Serving stale OFF search for %r', query)
            return json.loads(hit[0]), True
        raise

    with sqlite3.connect(path, timeout=3) as conn:
        conn.execute('DELETE FROM cache WHERE key IN (SELECT key FROM cache ORDER BY expires LIMIT MAX(0, (SELECT COUNT(*) FROM cache)-499))')
        conn.execute('INSERT OR REPLACE INTO cache VALUES (?, ?, ?)', (key, json.dumps(payload), now + TTL))
    return payload, False


def signer():
    return URLSafeTimedSerializer(current_app.secret_key, salt='off-food-reference-v1')


def active_provider():
    """USDA when a key is configured, Open Food Facts otherwise (FF-0099).

    Falling back rather than failing keeps search working on a fresh checkout with no
    key, and keeps the previous behaviour available if a key is ever revoked.
    """
    return 'usda' if (current_app.config.get('USDA_FDC_API_KEY') or '').strip() else 'openfoodfacts'


def _search_usda(query, page, api_key):
    from app.utils import usda

    try:
        payload = usda.search(query, page, api_key)
    except usda.UsdaUnavailable as exc:
        raise SearchUnavailable(
            'USDA search is unavailable right now. Your saved foods still work.'
        ) from exc

    results, seen = [], set()
    for food in payload['foods']:
        reference = usda.parse_food(food)
        if reference and reference['external_id'] not in seen:
            seen.add(reference['external_id'])
            results.append({**reference, 'token': signer().dumps(reference)})
    return {'results': results, 'page': page,
            'has_more': len(payload['foods']) >= usda.PAGE_SIZE,
            'omitted': len(payload['foods']) - len(results), 'source': 'usda',
            'stale': False}


def _search_openfoodfacts(query, page):
    payload, stale = cached_products(query, page)
    results, seen = [], set()
    for product in payload['products']:
        reference = parse_reference(product)
        if reference and reference['external_id'] not in seen:
            seen.add(reference['external_id'])
            results.append({**reference, 'token': signer().dumps(reference)})
    return {'results': results, 'page': page,
            'has_more': len(payload['products']) >= SEARCH_PAGE_SIZE,
            'omitted': len(payload['products']) - len(results), 'source': 'openfoodfacts',
            'stale': stale}


def search(query, page):
    if active_provider() == 'usda':
        return _search_usda(query, page, current_app.config.get('USDA_FDC_API_KEY'))
    return _search_openfoodfacts(query, page)


def decode_reference(token):
    try:
        return signer().loads(token, max_age=86400)
    except (BadSignature, SignatureExpired, TypeError) as exc:
        raise ValueError('This search selection has expired. Please search again.') from exc


def import_reference(token, user_id):
    from app import db
    from app.models.food import Food
    from app.routes.barcode_lookup import code_variants
    from sqlalchemy.exc import IntegrityError

    snapshot = decode_reference(token)

    # Provider-qualified identity (FF-0099). Tokens signed before that existed carry only
    # a barcode, and they expire within a day, so the fallback is short-lived by design.
    barcode = snapshot.get('barcode_id')
    external_id = snapshot.get('external_id') or (
        'openfoodfacts:' + barcode if barcode else None
    )
    if not external_id:
        raise ValueError('This search selection is not a food reference.')

    matches = [Food.external_id == external_id]
    if barcode:
        # A product cached by an earlier barcode scan predates the import and must be
        # reused rather than duplicated.
        from app.routes.barcode_lookup import code_variants
        matches.append(Food.barcode_id.in_(code_variants(barcode)))
    food = Food.query.filter(Food.user_id == user_id, db.or_(*matches)).first()
    if food:
        return food, snapshot

    fields = {key: snapshot.get(key) for key in ('name', 'brand', 'calories', 'protein_g',
        'carbs_g', 'fat_g', 'serving_amount', 'serving_unit', 'serving_size', 'barcode_id')}
    food = Food(user_id=user_id, external_id=external_id, **fields)
    # SQLite must have a real outer transaction before SAVEPOINT, otherwise RELEASE
    # can commit the import before the log validation has succeeded.
    connection = db.session.connection()
    if connection.dialect.name == 'sqlite' and not connection.connection.driver_connection.in_transaction:
        connection.exec_driver_sql('BEGIN')
    try:
        with db.session.begin_nested():
            db.session.add(food)
            db.session.flush()
    except IntegrityError:
        food = Food.query.filter_by(user_id=user_id, external_id=external_id).one()
    return food, snapshot
