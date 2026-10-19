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


class SearchUnavailable(Exception):
    pass


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
        'source': 'openfoodfacts',
    }


def fetch_products(query, page):
    params = urllib.parse.urlencode({'search_terms': query, 'search_simple': 1,
        'action': 'process', 'json': 1, 'page_size': 20, 'page': page,
        'fields': 'code,product_name,product_name_en,generic_name,brands,nutriments,serving_size,nutrition_data_per'})
    request = urllib.request.Request(SEARCH_URL + '?' + params, headers={'User-Agent': USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            payload = json.load(response)
        if not isinstance(payload, dict) or not isinstance(payload.get('products'), list):
            raise ValueError('Invalid provider response')
        return payload
    except (OSError, ValueError, urllib.error.URLError) as exc:
        raise SearchUnavailable('Food search is unavailable right now. Your saved foods still work.') from exc


def cached_products(query, page):
    path = current_app.config.get('OFF_SEARCH_CACHE_PATH') or os.path.join(tempfile.gettempdir(), 'awefit-off-search-v1.sqlite3')
    now = time.time()
    key = json.dumps([query.casefold(), page])
    with sqlite3.connect(path, timeout=3) as conn:
        conn.execute('CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT, expires REAL)')
        conn.execute('CREATE TABLE IF NOT EXISTS throttle (id INTEGER PRIMARY KEY, requested REAL)')
        conn.commit()
        conn.execute('BEGIN IMMEDIATE')
        conn.execute('DELETE FROM cache WHERE expires < ?', (now,))
        hit = conn.execute('SELECT value FROM cache WHERE key=?', (key,)).fetchone()
        if hit:
            return json.loads(hit[0])
        last = conn.execute('SELECT requested FROM throttle WHERE id=1').fetchone()
        if last and now - last[0] < 6.1:
            raise SearchLimited('Please wait a few seconds before searching Open Food Facts again.')
        conn.execute('INSERT OR REPLACE INTO throttle VALUES (1, ?)', (now,))
    payload = fetch_products(query, page)
    with sqlite3.connect(path, timeout=3) as conn:
        # Bounded public cache; expiration also clears stale rows.
        conn.execute('DELETE FROM cache WHERE key IN (SELECT key FROM cache ORDER BY expires LIMIT MAX(0, (SELECT COUNT(*) FROM cache)-499))')
        conn.execute('INSERT OR REPLACE INTO cache VALUES (?, ?, ?)', (key, json.dumps(payload), now + TTL))
    return payload


def signer():
    return URLSafeTimedSerializer(current_app.secret_key, salt='off-food-reference-v1')


def search(query, page):
    payload = cached_products(query, page)
    results, seen = [], set()
    for product in payload['products']:
        reference = parse_reference(product)
        if reference and reference['barcode_id'] not in seen:
            seen.add(reference['barcode_id'])
            results.append({**reference, 'token': signer().dumps(reference)})
    return {'results': results, 'page': page, 'has_more': len(payload['products']) == 20,
            'omitted': len(payload['products']) - len(results), 'source': 'openfoodfacts'}


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
    external_id = 'off:' + snapshot['barcode_id']
    food = Food.query.filter(Food.user_id == user_id, db.or_(
        Food.external_id == external_id,
        Food.barcode_id.in_(code_variants(snapshot['barcode_id'])))).first()
    if food:
        return food, snapshot
    fields = {key: snapshot[key] for key in ('name', 'brand', 'calories', 'protein_g',
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
