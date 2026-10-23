"""Water intake tracking in US fluid ounces; no prescribed intake targets."""
from datetime import date, datetime, time
import math
import re

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from app import db
from app.models.hydration_log import HydrationLog
from app.utils.exercise_calories import session_day

bp = Blueprint('hydration', __name__)


def serialize(log):
    return {'id': log.id, 'amount_oz': log.amount_oz,
            'logged_at': log.logged_at.isoformat(timespec='minutes'),
            'date': log.logged_at.date().isoformat(), 'notes': log.notes}


def values(data):
    if not isinstance(data, dict):
        raise ValueError('JSON object required')
    amount = data.get('amount_oz')
    if isinstance(amount, bool) or not isinstance(amount, (int, float)) or not math.isfinite(amount) or not 0 < amount <= 1000:
        raise ValueError('amount_oz must be greater than 0 and at most 1000 fluid ounces')
    stamp = data.get('logged_at')
    if not isinstance(stamp, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}', stamp):
        raise ValueError('logged_at must be local YYYY-MM-DDTHH:MM')
    try:
        logged_at = datetime.strptime(stamp, '%Y-%m-%dT%H:%M')
    except ValueError:
        raise ValueError('Invalid local date/time') from None
    notes = data.get('notes', '')
    if not isinstance(notes, str) or len(notes) > 1000:
        raise ValueError('Notes must be at most 1000 characters')
    return {'amount_oz': amount, 'logged_at': logged_at, 'notes': notes.strip()}


@bp.route('/options')
@login_required
def options():
    latest = HydrationLog.query.filter_by(user_id=current_user.id).order_by(HydrationLog.id.desc()).first()
    return jsonify({'unit': 'US fl oz', 'default_amount_oz': latest.amount_oz if latest else 24})


@bp.route('/logs', methods=['GET', 'POST'])
@login_required
def logs():
    if request.method == 'POST':
        try:
            fields = values(request.get_json())
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400
        log = HydrationLog(user_id=current_user.id, **fields)
        db.session.add(log)
        db.session.commit()
        return jsonify(serialize(log)), 201
    try:
        day = session_day(request.args.get('date', date.today().isoformat()))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    entries = HydrationLog.query.filter(HydrationLog.user_id == current_user.id,
        HydrationLog.logged_at >= datetime.combine(day, time.min),
        HydrationLog.logged_at <= datetime.combine(day, time.max)).order_by(HydrationLog.logged_at, HydrationLog.id).all()
    return jsonify({'date': day.isoformat(), 'total_oz': sum(log.amount_oz for log in entries),
                    'logs': [serialize(log) for log in entries]})


@bp.route('/logs/<int:log_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def entry(log_id):
    log = HydrationLog.query.filter_by(id=log_id, user_id=current_user.id).first()
    if log is None:
        return jsonify({'error': 'Hydration log not found'}), 404
    if request.method == 'DELETE':
        db.session.delete(log)
        db.session.commit()
        return jsonify({'success': True})
    if request.method == 'PUT':
        try:
            fields = values(request.get_json())
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400
        for key, value in fields.items():
            setattr(log, key, value)
        db.session.commit()
    return jsonify(serialize(log))
