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
import math
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
           'serving_size,serving_quantity,serving_quantity_unit,'
           'nutrition_data_per,nutriments')


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


#: Grams per unit for mass units OpenFoodFacts writes into serving text and
#: `serving_quantity_unit`. Volume is deliberately absent: millilitres only become
#: grams through a density nobody published, which is the guess FF-0134 removed.
_UNIT_GRAMS = {
    'g': 1.0,
    'gr': 1.0,
    'gram': 1.0,
    'grams': 1.0,
    'mg': 0.001,
    'kg': 1000.0,
    'kilogram': 1000.0,
    'kilograms': 1000.0,
    'oz': 28.349523125,
    'ounce': 28.349523125,
    'ounces': 28.349523125,
    'lb': 453.59237,
    'lbs': 453.59237,
    'pound': 453.59237,
    'pounds': 453.59237,
}

_VOLUME_UNITS = {'ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters',
                 'cl', 'l', 'litre', 'litres', 'liter', 'liters', 'dl'}

#: Every explicit mass mentioned anywhere in a serving label, so a compound label
#: like "1 bar (40 g)" or "1 portion (28.349 g)" yields its real mass.
_MASS_TOKEN_RE = re.compile(
    r'(\d+(?:[.,]\d+)?)\s*(g|gr|grams?|mg|kg|kilograms?|oz|ounces?|lbs?|pounds?)\b',
    re.IGNORECASE,
)

_SERVING_RE = re.compile(r'^\s*([0-9]+(?:[.,][0-9]+)?)\s*([a-zA-Z]+)\s*$')


def _positive_number(value):
    """A finite, strictly positive float, or None. Rejects bools and junk."""
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(str(value).replace(',', '.').strip())
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number <= 0:
        return None
    return number


def _unit_grams(unit):
    return _UNIT_GRAMS.get(str(unit or '').strip().lower().rstrip('.'))


def _normalise_unit(unit):
    return str(unit or '').strip().lower().rstrip('.')


def serving_mass_g(product):
    """Grams in one serving, or None when no explicit mass is published.

    Two independent sources are accepted, and nothing else:

    * a structured `serving_quantity` **accompanied by** a mass
      `serving_quantity_unit` — OpenFoodFacts normalises that quantity to grams
      *or* millilitres, so an unqualified number is not evidence of mass;
    * an explicit mass written into `serving_size`, including compound labels
      such as "1 bar (40 g)".

    Volume ("250 ml"), counts ("1 bar"), household measures and package quantity
    are not mass. Conflicting masses are ambiguous, so they are not mass either. A
    guess here is exactly the bug being fixed: it silently multiplies a whole
    package's nutrition into one serving.

    The label is still consulted when the structured quantity is qualified as a
    volume: a cereal box reads `serving_size` "1 taza (36 g)" while OFF publishes
    `serving_quantity_unit` "ml", and that printed gram figure is real evidence —
    reading it is not a volume-to-mass conversion (FF-0135).
    """
    quantity = _positive_number(product.get('serving_quantity'))
    unit = _normalise_unit(product.get('serving_quantity_unit'))
    structured = None
    if quantity is not None and unit:
        factor = _unit_grams(unit)
        if factor:
            structured = quantity * factor

    labelled = _mass_from_label(str(product.get('serving_size') or ''))
    if structured is None:
        return labelled
    if labelled is None:
        return structured
    # Both name a mass for the same serving, so a material disagreement means one
    # of them is not describing the serving.
    if abs(structured - labelled) > max(0.5, structured * 0.01):
        return None
    return structured


def _mass_from_label(text):
    """Grams named explicitly in a serving label, or None."""
    masses = []
    for match in _MASS_TOKEN_RE.finditer(text):
        number = _positive_number(match.group(1))
        factor = _unit_grams(match.group(2))
        if number is None or not factor:
            continue
        masses.append(number * factor)
    if not masses:
        return None
    # "40 g, 1.4 oz" would be two readings of one serving; pick the single value
    # they agree on, otherwise refuse rather than average a contradiction.
    first = masses[0]
    if all(abs(mass - first) <= 0.01 for mass in masses):
        return first
    return None


def nutrition_basis(product):
    """The unit the per-100 nutriments are expressed in: 'g' or 'ml'.

    `_100g` keys cover 100 ml products too, so a declared basis wins; only an
    undeclared basis falls back to a volume hint in the serving label.
    """
    declared = _normalise_unit(product.get('nutrition_data_per')).replace(' ', '')
    if declared in ('100ml', '100l'):
        return 'ml'
    if declared in ('100g', '100gr', '100gram', '100grams'):
        return 'g'
    if re.search(r'\d\s*(ml|cl|l)\b', str(product.get('serving_size') or ''), re.IGNORECASE):
        return 'ml'
    return 'g'



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
    """Per-100 kcal, falling back to converting per-100 kJ.

    Deliberately ignores the unqualified `energy-kcal` key: it carries no basis,
    and treating it as per-100 made a single serving read as a whole package.
    """
    kcal = nutriments.get('energy-kcal_100g')
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

    # Every nutriment above is per 100 of the declared basis. Presenting those as one
    # serving made a 15 g serving of Nutella read as 539 kcal instead of 81 (FF-0063),
    # so the numbers are always tied to a named reference: OFF's own per-serving
    # figures, a scaling of the per-100 values by a real serving mass, or the per-100
    # values themselves. Number and reference must describe the same quantity.
    basis = nutrition_basis(product)
    grams = serving_mass_g(product)
    published_calories = _serving_value(nutriments, 'energy-kcal')
    published_macros = [_serving_value(nutriments, key) for key in ('proteins', 'carbohydrates', 'fat')]
    label = (product.get('serving_size') or '').strip()

    if published_calories and published_calories > 0 and None not in published_macros:
        # OFF computed this serving itself: never rescale it, and never mix it with
        # per-100 macros, which describe a different quantity.
        calories = round(published_calories)
        protein_g, carbs_g, fat_g = published_macros
        serving_size = label or (f'{grams:g} g' if grams else '1 serving')
        serving_amount, serving_unit = ((grams, 'g') if grams else (1.0, 'serving'))
    elif grams and basis == 'g':
        # A real serving mass on a per-100g basis: scale exactly once.
        factor = grams / 100.0
        calories = round(calories * factor)
        if calories <= 0:
            return None
        protein_g = _scale(_macro(nutriments, 'proteins_100g'), factor)
        carbs_g = _scale(_macro(nutriments, 'carbohydrates_100g'), factor)
        fat_g = _scale(_macro(nutriments, 'fat_100g'), factor)
        serving_size = label or f'{grams:g} g'
        serving_amount, serving_unit = (grams, 'g')
    else:
        # No reliable package serving (or a per-100ml basis we cannot weigh): keep the
        # per-100 numbers and say so, rather than inventing a serving.
        protein_g = _macro(nutriments, 'proteins_100g')
        carbs_g = _macro(nutriments, 'carbohydrates_100g')
        fat_g = _macro(nutriments, 'fat_100g')
        serving_size = f'100 {basis}'
        serving_amount, serving_unit = (100.0, basis)

    return {
        'name': name[:120],
        'brand': brand[:100] if brand else None,
        'calories': calories,
        'protein_g': protein_g,
        'carbs_g': carbs_g,
        'fat_g': fat_g,
        'serving_size': serving_size[:255],
        # The reference the nutrition actually describes, so the form prefills the
        # real portion instead of re-parsing a human label (FF-0134).
        'serving_amount': serving_amount,
        'serving_unit': serving_unit,
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
