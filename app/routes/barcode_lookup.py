"""Barcode lookup: local foods first, OpenFoodFacts second.

    GET /api/food/barcode/<code>

A hit from the user's own food list is instant and offline. Anything else goes to
OpenFoodFacts, and a successful remote result is **saved as a Food row** for that
user so the second scan of the same tin is local, the product shows up in search,
and the app still works if the internet does not.
"""

from flask import Blueprint, current_app, jsonify
from flask_login import current_user, login_required
from sqlalchemy import or_, case

from app import db
from app.models.food import Food
from app.utils import openfoodfacts

bp = Blueprint('barcode', __name__)


def canonical_code(code):
    """The 13-digit form of a code, so UPC-A and EAN-13 are one product.

    A UPC-A (12 digits) is an EAN-13 with a leading zero — and ZXing reports a
    leading-zero EAN-13 as UPC-A, so the same shelf item arrives as either form
    depending on the symbology the decoder matched (FF-0060). Storing the 13-digit
    form keeps one row per product instead of two, and searching both forms means a
    row cached before this existed is still found.
    """
    if code is None:
        return None
    return '0' + code if len(code) == 12 else code


def code_variants(code):
    """Every form a stored barcode for this product might use."""
    canonical = canonical_code(code)
    variants = [canonical]
    if canonical and len(canonical) == 13 and canonical.startswith('0'):
        variants.append(canonical[1:])
    return [variant for variant in variants if variant]


def _local_food(code):
    """Rank all equivalent saved matches together, not one spelling at a time.

    Own foods win over shared foods; within that scope keep the photo-bearing
    saved record, then the oldest identity. A cached EAN duplicate must not hide
    the owner's photographed UPC food merely because EAN is tried first.
    """
    return Food.query.filter(
        Food.barcode_id.in_(code_variants(code)),
        or_(Food.user_id == current_user.id, Food.user_id.is_(None)),
    ).order_by(
        Food.user_id.is_(None),
        case((Food.photo_url.is_not(None) & (Food.photo_url != ''), 0), else_=1),
        Food.id.asc(),
    ).first()


@bp.route('/<code>', methods=['GET'])
@login_required
def lookup(code):
    normalised = openfoodfacts.normalise_code(code)
    if not normalised:
        return jsonify({'error': 'Barcode must be 6 to 14 digits'}), 400

    canonical = canonical_code(normalised)

    food = _local_food(normalised)
    if food:
        return jsonify({'food': food.to_dict(), 'source': 'local', 'barcode': food.barcode_id})

    try:
        product = openfoodfacts.lookup_barcode(canonical)
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
        barcode_id=canonical,
    )
    from app.utils.quantities import apply_reference
    apply_reference(food, {'serving_size': product['serving_size']})
    db.session.add(food)
    db.session.commit()

    return jsonify({'food': food.to_dict(), 'source': 'openfoodfacts', 'barcode': normalised})
