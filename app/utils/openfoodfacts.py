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
           'serving_size,serving_quantity,nutriments')


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


#: Grams per unit for the serving units OpenFoodFacts actually uses.
_UNIT_GRAMS = {
    'g': 1.0,
    'gr': 1.0,
    'gram': 1.0,
    'grams': 1.0,
    'kg': 1000.0,
    'ml': 1.0,
    'l': 1000.0,
    'cl': 10.0,
    'oz': 28.3495,
    'lb': 453.592,
}

_SERVING_RE = re.compile(r'^\s*([0-9]+(?:[.,][0-9]+)?)\s*([a-zA-Z]+)\s*$')


def serving_mass_g(product):
    """Grams in one serving, or None when the serving is not a mass.

    OpenFoodFacts publishes both `serving_quantity` (a number, grams for solids) and
    a human `serving_size` string. Either can name a mass; "1 cup" or "1 bar" cannot
    be converted without inventing a density, and a guess is exactly the bug being
    fixed here, so they return None.
    """
    quantity = product.get('serving_quantity')
    try:
        if quantity is not None:
            grams = float(quantity)
            if grams > 0:
                return grams
    except (TypeError, ValueError):
        pass

    match = _SERVING_RE.match(str(product.get('serving_size') or ''))
    if not match:
        return None
    number = float(match.group(1).replace(',', '.'))
    unit_grams = _UNIT_GRAMS.get(match.group(2).strip().lower())
    if not unit_grams or number <= 0:
        return None
    return number * unit_grams


def _serving_value(nutriments, key):
    """A per-serving nutriment OpenFoodFacts computed itself, if it published one.

    Preferred over scaling per-100g values: OFF already knows the serving's exact
    mass and rounding, and it also covers servings that are not a plain mass.
    """
    value = nutriments.get(f'{key}_serving')
    try:
        if value is not None:
            number = round(float(value), 1)
            return number if number >= 0 else None
    except (TypeError, ValueError):
        pass
    return None


def _scale(value, factor):
    """Scale a per-100g value to one serving, keeping one decimal."""
    if value is None:
        return None
    return round(value * factor, 1)


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

    # The nutriments above are all per 100 g. Presenting them as one serving made a
    # 15 g serving of Nutella read as 539 kcal instead of 81 (FF-0063), so scale to
    # the declared serving mass — or, when the serving is not a mass, keep the
    # per-100g numbers and say so in the label. Number and label must agree.
    # 1. OFF's own per-serving figures are authoritative when present.
    published_calories = _serving_value(nutriments, 'energy-kcal')
    if published_calories and published_calories > 0:
        calories = round(published_calories)
        protein_g = _serving_value(nutriments, 'proteins')
        carbs_g = _serving_value(nutriments, 'carbohydrates')
        fat_g = _serving_value(nutriments, 'fat')
        serving_size = (product.get('serving_size') or '').strip() or '1 serving'
    else:
        grams = serving_mass_g(product)

    if not published_calories and grams:
        factor = grams / 100.0
        calories = round(calories * factor)
        if calories <= 0:
            return None
        protein_g = _scale(_macro(nutriments, 'proteins_100g'), factor)
        carbs_g = _scale(_macro(nutriments, 'carbohydrates_100g'), factor)
        fat_g = _scale(_macro(nutriments, 'fat_100g'), factor)
        serving_size = (product.get('serving_size') or '').strip() or f'{round(grams)} g'
    elif not published_calories:
        protein_g = _macro(nutriments, 'proteins_100g')
        carbs_g = _macro(nutriments, 'carbohydrates_100g')
        fat_g = _macro(nutriments, 'fat_100g')
        serving_size = '100 g'

    return {
        'name': name[:120],
        'brand': brand[:100] if brand else None,
        'calories': calories,
        'protein_g': protein_g,
        'carbs_g': carbs_g,
        'fat_g': fat_g,
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
