"""OpenFoodFacts lookup for barcode scanning.

Kept apart from the route so the network call is one function with one shape, and
so tests can replace it without a socket. The server does the lookup, not the
phone: one HTTP client, one place to add a user agent and a timeout, and no
third-party CORS policy to depend on.

Everything here degrades to `None`. A barcode that is not in the database, a
timeout, a TLS error, a malformed payload — all of it means "we don't know this
product", which the route turns into a 404 the client can show. None of it should
ever surface as a 500 to someone standing in a supermarket.
"""

import json
import re
import urllib.error
import urllib.parse
import urllib.request

OFF_URL = 'https://world.openfoodfacts.org/api/v2/product/{code}.json'
USER_AGENT = 'AweFit/0.1 (personal fitness tracker)'
TIMEOUT_SECONDS = 6

# EAN-8, UPC-A/E, EAN-13, ITF-14 and a little slack for odd real-world codes.
BARCODE_RE = re.compile(r'^\d{6,14}$')

_FIELDS = ('fields=product_name,product_name_en,generic_name,brands,'
           'serving_size,nutriments')


class OpenFoodFactsUnavailable(Exception):
    """The lookup could not be attempted (network, TLS, timeout)."""


def normalise_code(code):
    """Strip and validate a scanned/typed code; returns None when it is not one."""
    if code is None:
        return None
    cleaned = str(code).strip().replace(' ', '').replace('-', '')
    return cleaned if BARCODE_RE.match(cleaned) else None


def _first_name(product):
    for key in ('product_name', 'product_name_en', 'generic_name'):
        value = (product.get(key) or '').strip()
        if value:
            return value
    return None


def _calories(nutriments):
    """Prefer kcal; fall back to converting kJ (energy_100g)."""
    kcal = nutriments.get('energy-kcal_100g')
    if kcal is None:
        kcal = nutriments.get('energy-kcal')
    try:
        if kcal is not None:
            value = round(float(kcal))
            return value if value > 0 else None
    except (TypeError, ValueError):
        pass

    kj = nutriments.get('energy_100g')
    try:
        if kj is not None:
            value = round(float(kj) / 4.184)
            return value if value > 0 else None
    except (TypeError, ValueError):
        pass
    return None


def _macro(nutriments, key):
    try:
        return round(float(nutriments.get(key) or 0.0), 1)
    except (TypeError, ValueError):
        return 0.0


def parse_product(payload):
    """Turn an OpenFoodFacts v2 payload into the shape our Food model wants.

    Returns None when the product is unusable: no name, or no calories. Storing a
    0 kcal food would silently log nothing, which is worse than saying "not found".
    """
    if not isinstance(payload, dict):
        return None
    if payload.get('status') not in (1, '1'):
        return None

    product = payload.get('product')
    if not isinstance(product, dict):
        return None

    name = _first_name(product)
    nutriments = product.get('nutriments') or {}
    if not isinstance(nutriments, dict):
        nutriments = {}
    calories = _calories(nutriments)
    if not name or calories is None:
        return None

    brand = (product.get('brands') or '').split(',')[0].strip() or None
    serving_size = (product.get('serving_size') or '').strip() or '100 g'

    return {
        'name': name[:120],
        'brand': brand[:100] if brand else None,
        'calories': calories,
        'protein_g': _macro(nutriments, 'proteins_100g'),
        'carbs_g': _macro(nutriments, 'carbohydrates_100g'),
        'fat_g': _macro(nutriments, 'fat_100g'),
        'serving_size': serving_size[:255],
    }


def lookup_barcode(code, timeout=TIMEOUT_SECONDS):
    """Fetch and normalise a product. Returns None when unknown, raises when unreachable."""
    url = OFF_URL.format(code=urllib.parse.quote(code)) + '?' + _FIELDS
    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.load(response)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as exc:
        raise OpenFoodFactsUnavailable(str(exc)) from exc
    except ValueError:
        # A body that is not JSON is a broken response, not a missing product.
        raise OpenFoodFactsUnavailable('response was not JSON')

    return parse_product(payload)
