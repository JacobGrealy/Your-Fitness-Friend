#!/usr/bin/env python3
"""Re-fetch barcode-cached foods and correct their per-serving numbers (FF-0063).

`parse_product` used to take OpenFoodFacts' per-100g nutriments and attach them to
the product's serving label, so a 28 g serving of peanuts was stored as 536 kcal
instead of ~150. The parser is fixed, but rows already cached in `foods` keep the
old numbers and are served from the database forever — that is the whole point of
the cache. This script re-reads them from OpenFoodFacts and rewrites them.

    python3 scripts/refresh-barcode-foods.py            # dry run: show the diffs
    python3 scripts/refresh-barcode-foods.py --apply    # write the corrections

Deliberately does NOT touch `food_logs`: those rows are a record of what was
believed when the food was logged, and rewriting history is a different decision
from fixing a lookup. Re-log the item to get the corrected numbers.
"""

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault('FLASK_CONFIG', 'production')

from app import create_app, db                     # noqa: E402
from app.models.food import Food                   # noqa: E402
from app.utils import openfoodfacts                # noqa: E402

FIELDS = ('calories', 'protein_g', 'carbs_g', 'fat_g', 'serving_size')


def describe(food):
    return (f'{food.calories} kcal  P{food.protein_g} C{food.carbs_g} F{food.fat_g}'
            f'  per "{food.serving_size or "?"}"')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true',
                        help='write the corrections (default is a dry run)')
    args = parser.parse_args()

    app = create_app('production')
    changed = failed = skipped = 0

    with app.app_context():
        foods = Food.query.filter(Food.barcode_id.isnot(None)).order_by(Food.id).all()
        print(f'{len(foods)} barcode-cached foods\n')

        for food in foods:
            code = food.barcode_id
            try:
                product = openfoodfacts.lookup_barcode(code)
            except openfoodfacts.OpenFoodFactsUnavailable as exc:
                print(f'  #{food.id} {food.name[:32]:34} SKIP  lookup failed: {exc}')
                failed += 1
                continue

            if not product:
                print(f'  #{food.id} {food.name[:32]:34} SKIP  product no longer listed')
                skipped += 1
                continue

            new = {field: product[field] for field in FIELDS}
            differences = {
                field: (getattr(food, field), new[field])
                for field in FIELDS
                if getattr(food, field) != new[field]
            }
            if not differences:
                print(f'  #{food.id} {food.name[:32]:34} ok    {describe(food)}')
                continue

            changed += 1
            print(f'  #{food.id} {food.name[:32]:34} FIX')
            print(f'      was: {describe(food)}')
            for field, (old, value) in differences.items():
                print(f'      {field}: {old!r} -> {value!r}')
            if args.apply:
                for field, value in new.items():
                    setattr(food, field, value)
            print(f'      now: {describe(food) if args.apply else "  (dry run)"}')

        if args.apply:
            db.session.commit()
            print(f'\ncommitted: {changed} foods corrected, {skipped} skipped, {failed} failed')
        else:
            print(f'\nwould correct: {changed}, skipped {skipped}, failed {failed}')
            print('re-run with --apply to write them')

    return 0


if __name__ == '__main__':
    sys.exit(main())
