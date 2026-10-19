"""USDA FoodData Central search: generic reference foods, per 100 g (FF-0099).

Open Food Facts answers text search unreliably (FF-0098 measured roughly one success in
five), while its barcode data is good. USDA is the opposite: its Foundation and SR Legacy
sets are the reference values for whole foods — "Apples, fuji, with skin, raw" — which is
what logging an apple by weight actually needs.

Everything here normalises to the same shape `food_search` already handles, so the serving
model, the signed selection token and the import-on-log path do not care which provider
answered.
"""

import json
import math
import urllib.error
import urllib.parse
import urllib.request

SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'
# Reference data only. Branded foods are UPC-driven and belong to the barcode path.
DATA_TYPES = 'Foundation,SR Legacy'
PAGE_SIZE = 20
TIMEOUT_SECONDS = 8

#: Energy appears under several names depending on the dataset, and the unit varies.
ENERGY_NAMES = (
    'Energy',
    'Energy (Atwater General Factors)',
    'Energy (Atwater Specific Factors)',
)

MACRO_NAMES = {
    'protein_g': 'Protein',
    'carbs_g': 'Carbohydrate, by difference',
    'fat_g': 'Total lipid (fat)',
}


class UsdaUnavailable(Exception):
    """The search could not be attempted or the provider rejected it."""


class UsdaKeyMissing(Exception):
    """No API key configured, so USDA cannot be used."""


def _nutrients(food):
    """name -> (value, unit) for the nutrients a food actually carries."""
    table = {}
    for nutrient in food.get('foodNutrients') or []:
        if not isinstance(nutrient, dict):
            continue
        name = nutrient.get('nutrientName')
        value = nutrient.get('value')
        if name is None or value is None:
            continue
        try:
            number = float(value)
        except (TypeError, ValueError):
            continue
        if math.isfinite(number):
            table.setdefault(name, []).append((number, str(nutrient.get('unitName') or '').upper()))
    return table


def _energy_kcal(table):
    """Calories per 100 g, preferring kcal and converting kJ when that is all there is."""
    kj_fallback = None
    for name in ENERGY_NAMES:
        for value, unit in table.get(name, []):
            if value <= 0:
                continue
            if unit in ('KCAL', 'Kcal', ''):
                return value
            if unit == 'KJ':
                kj_fallback = value / 4.184
    return kj_fallback


def parse_food(food):
    """A USDA food as our reference shape, or None when its nutrition is incomplete.

    Never fills a gap with zero: a food missing protein is left out rather than logged as
    a zero-protein one, the same rule the Open Food Facts parser follows.
    """
    if not isinstance(food, dict):
        return None

    fdc_id = food.get('fdcId')
    description = (food.get('description') or '').strip()
    if not fdc_id or not description:
        return None

    table = _nutrients(food)
    calories = _energy_kcal(table)
    if calories is None or calories <= 0:
        return None

    macros = {}
    for key, name in MACRO_NAMES.items():
        values = table.get(name)
        if not values:
            return None
        macros[key] = values[0][0]

    if any(value < 0 for value in macros.values()):
        return None

    return {
        'name': description[:120],
        # USDA's own spelling is kept: it names the variety and preparation, and renaming
        # it would invent a food the reference does not describe.
        # A brand is a brand: USDA reference foods have none, and storing "Foundation"
        # as one would be a lie the food list keeps repeating.
        'brand': None,
        'data_type': (food.get('dataType') or '')[:40] or None,
        'calories': max(1, round(calories)),
        **macros,
        # USDA publishes per 100 g for these datasets.
        'serving_amount': 100,
        'serving_unit': 'g',
        'serving_size': '100 g',
        'barcode_id': None,
        'external_id': f'usda:{fdc_id}',
        'source': 'usda',
    }


def search(query, page, api_key, timeout=TIMEOUT_SECONDS):
    """Fetch one page of USDA results and normalise them."""
    if not api_key:
        raise UsdaKeyMissing('no USDA API key configured')

    params = urllib.parse.urlencode({
        'api_key': api_key,
        'query': query,
        'dataType': DATA_TYPES,
        'pageSize': PAGE_SIZE,
        'pageNumber': page,
        # Ask for alphabetical descriptions so a page holds "Apples, ..." rather than an
        # arbitrary slice; rank_foods then puts the plainest form first.
        'sortBy': 'lowercaseDescription.keyword',
        'sortOrder': 'asc',
    })
    request = urllib.request.Request(SEARCH_URL + '?' + params, headers={'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        # 429 is a rate limit (the shared DEMO_KEY hits it); 5xx is the service.
        raise UsdaUnavailable(f'USDA returned {exc.code}') from exc
    except (OSError, ValueError, urllib.error.URLError) as exc:
        raise UsdaUnavailable(str(exc)) from exc

    if not isinstance(payload, dict) or not isinstance(payload.get('foods'), list):
        raise UsdaUnavailable('USDA payload was not a search result')
    payload['foods'] = rank_foods(query, payload['foods'])
    return payload


def rank_foods(query, foods):
    """Order results the way someone logging food expects.

    Searching "apple" otherwise leads with "Croissants, apple" and "Babyfood, juice,
    apple", because USDA matches the word anywhere in an inverted name. The plain food
    is the one being looked for: its name starts with the query, and it comes from
    Foundation (the reference dataset) rather than a prepared dish.
    """
    term = (query or '').strip().lower()
    singular = term[:-1] if term.endswith('s') else term

    def score(food):
        description = str(food.get('description') or '').lower()
        starts_with_query = 0 if description.startswith((term, singular)) else 1
        is_foundation = 0 if food.get('dataType') == 'Foundation' else 1
        return (starts_with_query, is_foundation, len(description))

    return sorted(foods, key=score)
