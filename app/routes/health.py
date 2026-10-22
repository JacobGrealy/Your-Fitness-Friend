"""Owner-scoped health diary. Dose options reflect the owner's supplied pill strengths."""
from datetime import date, datetime, time
import math
import re

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app import db
from app.models.health_log import HealthLog

bp = Blueprint('health', __name__)
DOSES = (1.5, 4, 9, 25)


def serialize(log):
    return {'id': log.id, 'kind': log.kind, 'logged_at': log.logged_at.isoformat(timespec='minutes'),
            'date': log.logged_at.date().isoformat(), 'dose_mg': log.dose_mg,
            'medication': 'Wegovy pill' if log.kind == 'medication' else None, 'notes': log.notes}


def values(data, existing=None):
    if not isinstance(data, dict):
        raise ValueError('JSON object required')
    kind = data.get('kind')
    if kind not in ('medication', 'bowel') or existing and kind != existing.kind:
        raise ValueError('kind must be medication or bowel and cannot change when editing')
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
    dose = data.get('dose_mg')
    if kind == 'medication':
        if isinstance(dose, bool) or not isinstance(dose, (int, float)) or not math.isfinite(dose) or dose not in DOSES:
            raise ValueError('dose_mg must be 1.5, 4, 9 or 25')
    elif dose is not None:
        raise ValueError('Bowel movement logs do not have a dose')
    return dict(kind=kind, logged_at=logged_at, dose_mg=dose, notes=notes.strip())


@bp.route('/options')
@login_required
def options():
    # Last logged choice, not highest dose or latest occurrence date. Backdating an
    # intake must not turn this into automatic dose escalation or a recommendation.
    latest = HealthLog.query.filter_by(user_id=current_user.id, kind='medication').order_by(HealthLog.id.desc()).first()
    return jsonify({'medication': 'Wegovy pill', 'dose_options_mg': DOSES,
                    'default_dose_mg': latest.dose_mg if latest else DOSES[0]})


@bp.route('/logs', methods=['GET', 'POST'])
@login_required
def logs():
    if request.method == 'POST':
        try:
            fields = values(request.get_json())
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400
        log = HealthLog(user_id=current_user.id, **fields)
        db.session.add(log)
        db.session.commit()
        return jsonify(serialize(log)), 201
    day_string = request.args.get('date', date.today().isoformat())
    try:
        day = date.fromisoformat(day_string)
        if day.isoformat() != day_string:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'error': 'date must be YYYY-MM-DD'}), 400
    entries = HealthLog.query.filter(
        HealthLog.user_id == current_user.id,
        HealthLog.logged_at >= datetime.combine(day, time.min),
        HealthLog.logged_at <= datetime.combine(day, time.max),
    ).order_by(HealthLog.logged_at.desc(), HealthLog.id.desc()).all()
    return jsonify([serialize(log) for log in entries])


@bp.route('/copy', methods=['POST'])
@login_required
def copy_health_entries():
    from app.utils.diary_copy import CopyError, copy_entries
    data = request.get_json()
    kind = data.get('kind') if isinstance(data, dict) else None
    if kind not in ('medication', 'bowel'):
        return jsonify({'error': 'Choose medication or bowel entries'}), 400
    try:
        result = copy_entries(current_user, kind, data)
    except CopyError as exc:
        return jsonify({'error': str(exc)}), exc.status
    return jsonify(result), 200 if result['replayed'] else 201


@bp.route('/logs/<int:log_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def entry(log_id):
    log = HealthLog.query.filter_by(id=log_id, user_id=current_user.id).first()
    if log is None:
        return jsonify({'error': 'Log not found'}), 404
    if request.method == 'DELETE':
        db.session.delete(log)
        db.session.commit()
        return jsonify({'message': 'Log deleted'})
    if request.method == 'PUT':
        try:
            fields = values(request.get_json(), existing=log)
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400
        for key, value in fields.items():
            setattr(log, key, value)
        db.session.commit()
    return jsonify(serialize(log))
