"""Per-serving nutrition and the one place that converts it (FF-0083).

`food_logs.calories` used to mean a total on some rows and a per-serving value on others,
because only one of the three write paths multiplied by the serving count. Storing the
per-serving figures explicitly removes the ambiguity: totals stay the derived quantity that
every consumer (diary sums, dashboard, streaks, badges) already reads, and
`total = per_serving * servings` is computed here rather than in each client.

Precision is kept everywhere; presentation rounds (two decimals) at the edge.
"""

MACROS = ('calories', 'protein_g', 'carbs_g', 'fat_g')

MACRO_LABELS = {
    'calories': 'calories',
    'protein_g': 'protein',
    'carbs_g': 'carbs',
    'fat_g': 'fat',
}


def normalise_servings(value, default=1.0):
    """A positive serving count, falling back to `default` for anything unusable."""
    try:
        servings = float(value)
    except (TypeError, ValueError):
        return float(default)
    if servings <= 0:
        return float(default)
    return servings


def per_serving_from_totals(totals, servings):
    """Derive per-serving values from stored totals.

    Used by the migration and by any caller that only knows the total (older clients).
    """
    servings = normalise_servings(servings)
    resolved = {}
    for macro in MACROS:
        value = totals.get(macro)
        resolved[macro] = None if value is None else (float(value) / servings)
    return resolved


def totals_from_per_serving(per_serving, servings):
    """The derived total for a serving count, rounded the way the app displays it.

    Calories are whole numbers on the wire and in the schema (an Integer column), so they
    are rounded here; macros keep full precision.
    """
    servings = normalise_servings(servings)
    totals = {}
    for macro in MACROS:
        value = per_serving.get(macro)
        if value is None:
            totals[macro] = None
            continue
        scaled = float(value) * servings
        totals[macro] = int(round(scaled)) if macro == 'calories' else scaled
    return totals


def default_servings(per_serving):
    """A serving count of one is what a missing count means everywhere else."""
    return 1.0 if per_serving else 1.0
