"""Structured serving references. US customary volumes; never infer density (FF-0094)."""
import math
import re

UNITS = {
    'g': ('mass', 1), 'kg': ('mass', 1000), 'oz': ('mass', 28.349523125),
    'lb': ('mass', 453.59237), 'ml': ('volume', 1),
    'cup': ('volume', 236.5882365), 'tbsp': ('volume', 14.78676478125),
    'tsp': ('volume', 4.92892159375), 'serving': ('serving', 1), 'item': ('item', 1),
}
ALIASES = {'grams': 'g', 'gram': 'g', 'ounces': 'oz', 'ounce': 'oz',
           'cups': 'cup', 'tablespoons': 'tbsp', 'teaspoons': 'tsp',
           'servings': 'serving', 'items': 'item', 'lbs': 'lb'}


def positive(value):
    if isinstance(value, bool):
        raise ValueError('Amount must be a positive finite number')
    number = float(value)
    if not math.isfinite(number) or number <= 0:
        raise ValueError('Amount must be a positive finite number')
    return number


def reference(amount, unit):
    amount = positive(amount)
    if unit not in UNITS:
        raise ValueError('Unsupported serving unit')
    return amount, unit


def parse_label(text):
    match = re.fullmatch(r'\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*', text or '')
    if not match:
        return None, None
    unit = ALIASES.get(match[2].lower(), match[2].lower())
    try:
        return reference(match[1], unit)
    except ValueError:
        return None, None


def apply_reference(obj, data):
    if 'serving_amount' in data or 'serving_unit' in data:
        amount = data.get('serving_amount', obj.serving_amount)
        unit = data.get('serving_unit', obj.serving_unit)
        if amount is None and unit is None:
            obj.serving_amount = obj.serving_unit = None
            return
        obj.serving_amount, obj.serving_unit = reference(amount, unit)
        obj.serving_size = f'{obj.serving_amount:g} {unit}'
    elif 'serving_size' in data:
        obj.serving_amount, obj.serving_unit = parse_label(data['serving_size'])


def serving_count(amount, unit, serving_amount, serving_unit):
    amount, unit = reference(amount, unit)
    serving_amount, serving_unit = reference(serving_amount, serving_unit)
    if unit == 'serving':
        return amount
    if UNITS[unit][0] != UNITS[serving_unit][0]:
        raise ValueError('These units cannot be converted without a food-specific conversion')
    return amount * UNITS[unit][1] / (serving_amount * UNITS[serving_unit][1])


def apply_consumed(log, data):
    """Map explicit physical quantity onto the existing per-serving arithmetic."""
    apply_reference(log, data)
    if 'amount' in data or 'unit' in data:
        amount = data.get('amount', log.amount)
        unit = data.get('unit', log.unit)
        if not log.serving_amount:
            if unit != 'serving':
                raise ValueError('This food has no structured serving reference')
            count = positive(amount)
        else:
            count = serving_count(amount, unit, log.serving_amount, log.serving_unit)
        log.amount, log.unit = positive(amount), unit
        return {**data, 'number_of_servings': count}
    if log.serving_amount:
        count = positive(data.get('number_of_servings', log.number_of_servings) or 1)
        log.amount, log.unit = count * log.serving_amount, log.serving_unit
    else:
        log.amount, log.unit = positive(data.get('number_of_servings', log.number_of_servings) or 1), 'serving'
    return data
