"""Diary completion endpoints (FF-0054)."""

from datetime import date, datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.utils.diary_completion import (
    badges,
    build_completion,
    completion_streaks,
    get_completion,
    summarise_record,
    undo_completion,
    weekly_summary,
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
        # Streaks still come back for an open day: the diary shows the run that is
        # alive right now, which is the nudge to close today (FF-0068).
        return jsonify({
            'date': target_date.isoformat(),
            'completed': False,
            'streaks': completion_streaks(
                current_user.id, target_date, current_user.daily_calorie_goal
            ),
            # The strip is drawn from the same request the diary and Home already
            # make, so it appears before the day is closed too (FF-0071).
            'week': weekly_summary(current_user.id, target_date),
        })
    return jsonify(summarise_record(current_user, record))


@bp.route('/complete', methods=['DELETE'])
@login_required
def undo():
    """Un-complete a day. Logging after completing is allowed either way."""
    target_date, error = _requested_date()
    if error:
        return error
    removed = undo_completion(current_user.id, target_date)
    return jsonify({'date': target_date.isoformat(), 'completed': False, 'removed': removed})


@bp.route('/badges', methods=['GET'])
@login_required
def badge_list():
    """Week badges, repeatable, with counts and lifetime stats (FF-0071)."""
    target_date, error = _requested_date()
    if error:
        return error
    return jsonify(badges(current_user.id, target_date, current_user.daily_calorie_goal))
