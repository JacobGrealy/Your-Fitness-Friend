"""Diary completion endpoints (FF-0054)."""

from datetime import date, datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.utils.diary_completion import (
    build_completion,
    get_completion,
    undo_completion,
)

bp = Blueprint('diary', __name__)


def _requested_date():
    """Parse `date` from the query string or JSON body, defaulting to today."""
    raw = request.args.get('date')
    if raw is None and request.is_json:
        raw = (request.get_json(silent=True) or {}).get('date')
    if not raw:
        return date.today(), None
    try:
        return datetime.strptime(raw, '%Y-%m-%d').date(), None
    except (TypeError, ValueError):
        return None, (jsonify({'error': 'date must be YYYY-MM-DD'}), 400)


@bp.route('/complete', methods=['POST'])
@login_required
def complete():
    """Finish the day and return the summary plus the five-week projection."""
    target_date, error = _requested_date()
    if error:
        return error
    return jsonify(build_completion(current_user, target_date))


@bp.route('/completion', methods=['GET'])
@login_required
def completion():
    """Whether the day has been completed, without changing anything."""
    target_date, error = _requested_date()
    if error:
        return error
    record = get_completion(current_user.id, target_date)
    if record is None:
        return jsonify({'date': target_date.isoformat(), 'completed': False})
    return jsonify({
        'date': record.date.isoformat(),
        'completed': True,
        'completed_at': record.completed_at.isoformat() if record.completed_at else None,
        'totals': {
            'calories': record.calories,
            'protein_g': record.protein_g,
            'carbs_g': record.carbs_g,
            'fat_g': record.fat_g,
        },
    })


@bp.route('/complete', methods=['DELETE'])
@login_required
def undo():
    """Un-complete a day. Logging after completing is allowed either way."""
    target_date, error = _requested_date()
    if error:
        return error
    removed = undo_completion(current_user.id, target_date)
    return jsonify({'date': target_date.isoformat(), 'completed': False, 'removed': removed})
