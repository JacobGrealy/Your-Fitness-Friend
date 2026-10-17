"""Barcode lookup: local foods first, OpenFoodFacts second.

    GET /api/food/barcode/<code>

A hit from the user's own food list is instant and offline. Anything else goes to
OpenFoodFacts, and a successful remote result is **saved as a Food row** for that
user so the second scan of the same tin is local, the product shows up in search,
and the app still works if the internet does not.
"""

from flask import Blueprint, current_app, jsonify
from flask_login import current_user, login_required
from sqlalchemy import or_

from app import db
from app.models.food import Food
from app.utils import openfoodfacts

bp = Blueprint('barcode', __name__)


def _local_food(code):
    """The user's own food for this barcode, or a shared (user-less) one."""
    return Food.query.filter(
        Food.barcode_id == code,
        or_(Food.user_id == current_user.id, Food.user_id.is_(None)),
    ).order_by(Food.user_id.is_(None)).first()


@bp.route('/<code>', methods=['GET'])
@login_required
def lookup(code):
    normalised = openfoodfacts.normalise_code(code)
    if not normalised:
        return jsonify({'error': 'Barcode must be 6 to 14 digits'}), 400

    food = _local_food(normalised)
    if food:
        return jsonify({'food': food.to_dict(), 'source': 'local', 'barcode': normalised})

    try:
        product = openfoodfacts.lookup_barcode(normalised)
    except openfoodfacts.OpenFoodFactsUnavailable as exc:
        # Not the user's problem, and not a 500: report it as "couldn't look it
        # up" so the client can offer manual entry instead of a stack trace.
        current_app.logger.warning('OpenFoodFacts unavailable for %s: %s', normalised, exc)
        return jsonify({
            'error': 'Product lookup is unavailable right now',
            'barcode': normalised,
        }), 503

    if not product:
        return jsonify({
            'error': 'No product found for that barcode',
            'barcode': normalised,
        }), 404

    # Cache it against this user: one row per (user, barcode).
    food = Food(
        user_id=current_user.id,
        name=product['name'],
        calories=product['calories'],
        protein_g=product['protein_g'],
        carbs_g=product['carbs_g'],
        fat_g=product['fat_g'],
        serving_size=product['serving_size'],
        brand=product['brand'],
        barcode_id=normalised,
    )
    db.session.add(food)
    db.session.commit()

    return jsonify({'food': food.to_dict(), 'source': 'openfoodfacts', 'barcode': normalised})
