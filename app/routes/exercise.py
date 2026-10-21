from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app.models.exercise_log import ExerciseLog
from app.models.saved_exercise import SavedExercise
from app.utils.qwen_client import qwen_client
from app import db
from datetime import date, datetime, time
import math


def _day(value):
    """Require a calendar date, not a timestamp or a permissive ISO shorthand."""
    if not isinstance(value, str):
        raise ValueError
    parsed = date.fromisoformat(value)
    if parsed.isoformat() != value:
        raise ValueError
    return parsed

bp = Blueprint('exercise', __name__)


def _serialize(log):
    return {
        'id': log.id, 'exercise_name': log.exercise_name,
        'saved_exercise_id': log.saved_exercise_id,
        'duration_min': log.duration, 'calories_burned': log.calories_burned,
        'intensity': log.intensity, 'notes': log.notes,
        'logged_at': log.logged_at.isoformat(), 'date': log.logged_at.date().isoformat(),
        'activity_id': log.activity_id, 'tracking_format': log.tracking_format,
        'details': log.details,
    }


def _typed_values(data, user, existing=None):
    from app.utils.exercise_calories import session_day, weight_snapshot, treadmill_estimate
    if data.get('activity_id') != 'treadmill_walking':
        raise ValueError('Unknown activity_id')
    day = session_day(data.get('date'))
    notes = data.get('notes')
    if notes is not None and (not isinstance(notes, str) or len(notes) > 500):
        raise ValueError('Notes must be at most 500 characters')
    # Editing historical inputs preserves the original body-weight snapshot unless
    # the session moves to another date. Later weigh-ins never rewrite old logs.
    if existing and existing.details and existing.logged_at.date() == day:
        weight = {key: existing.details[key] for key in (
            'weight_lbs', 'weight_kg', 'weight_source', 'weight_date')}
    else:
        weight = weight_snapshot(user, day)
    details = treadmill_estimate(data, weight)
    return dict(activity_id='treadmill_walking', tracking_format='treadmill',
                exercise_name='Walking Pad / Treadmill', duration=details['duration_minutes'],
                calories_burned=details['calories_burned'], details=details,
                logged_at=datetime.combine(day, time.min), notes=notes)


@bp.route('/catalog', methods=['GET'])
@login_required
def activity_catalog():
    from app.utils.exercise_calories import CATALOG
    return jsonify(CATALOG)


def _typed_request(data, existing=None, preview=False):
    try:
        values = _typed_values(data, current_user, existing)
    except (ValueError, TypeError) as exc:
        return jsonify({'error': str(exc)}), 400
    if preview:
        return jsonify(values['details'])
    if existing is None:
        existing = ExerciseLog(user_id=current_user.id, **values)
        db.session.add(existing)
    else:
        for key, value in values.items():
            setattr(existing, key, value)
    db.session.commit()
    return jsonify(_serialize(existing)), 200 if request.method == 'PUT' else 201


@bp.route('/log/<int:log_id>', methods=['GET'])
@login_required
def get_exercise_log(log_id):
    log = ExerciseLog.query.filter_by(id=log_id, user_id=current_user.id).first()
    if log is None:
        return jsonify({'error': 'Exercise log not found'}), 404
    return jsonify(_serialize(log))


@bp.route('/log/<int:log_id>', methods=['PUT'])
@login_required
def update_typed_exercise(log_id):
    log = ExerciseLog.query.filter_by(id=log_id, user_id=current_user.id).first()
    if log is None:
        return jsonify({'error': 'Exercise log not found'}), 404
    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({'error': 'JSON object required'}), 400
    if log.activity_id is None:
        return jsonify({'error': 'Legacy logs cannot be converted without original inputs'}), 400
    return _typed_request(data, existing=log)


@bp.route('/log', methods=['POST'])
@login_required
def log_exercise():
    """Log an exercise with AI-calorie estimation."""
    data = request.get_json()
    
    if not isinstance(data, dict) or not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'activity_id' in data:
        return _typed_request(data)

    saved = None
    if 'exercise_id' in data:
        exercise_id = data['exercise_id']
        if isinstance(exercise_id, bool) or not str(exercise_id).isdigit():
            return jsonify({'error': 'Invalid exercise_id'}), 400
        saved = SavedExercise.query.filter_by(
            id=int(exercise_id), user_id=current_user.id
        ).first()
        if saved is None:
            return jsonify({'error': 'Saved exercise not found'}), 404

    # A selected activity is authoritative; legacy description clients still work.
    exercise_description = saved.name if saved else (
        data.get('exercise_description') or data.get('exercise_name')
    )
    if not isinstance(exercise_description, str) or not exercise_description.strip():
        return jsonify({'error': 'Exercise name required'}), 400
    exercise_description = exercise_description.strip()
    if len(exercise_description) > 100:
        return jsonify({'error': 'Exercise name must be at most 100 characters'}), 400
    try:
        logged_at = datetime.combine(_day(data.get('date', date.today().isoformat())), time.min)
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid date. Use YYYY-MM-DD.'}), 400
    duration_min = data.get('duration_min', data.get('duration_minutes'))
    intensity = data.get('intensity')
    sets = data.get('sets')
    reps = data.get('reps')
    weight_lbs = data.get('weight_lbs')
    notes = data.get('notes')
    
    if not exercise_description or not duration_min:
        return jsonify({'error': 'exercise_description and duration_min required'}), 400
    
    try:
        if isinstance(duration_min, bool):
            raise ValueError
        duration_min = float(duration_min)
        if not math.isfinite(duration_min) or duration_min <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'error': 'duration_min must be a positive number'}), 400
    
    # Get user's weight from profile
    user_weight = current_user.weight  # from User model
    
    if not user_weight:
        return jsonify({
            'error': 'User weight not set',
            'message': 'Please set your weight in your profile first'
        }), 400
    
    # Weight is stored in lbs, convert to kg for calorie calculation
    weight_kg = user_weight * 0.453592
    
    # Estimate calories via Qwen AI
    try:
        estimation = qwen_client.estimate_exercise_calories(
            description=exercise_description,
            duration_min=duration_min,
            weight_kg=weight_kg
        )
        calories_burned = estimation['calories']
    except Exception:
        # Fallback: use simple calculation if AI fails
        # Basic estimate: MET * weight_kg * duration_hours
        # Using average MET of 5 for moderate exercise
        calories_burned = 5 * weight_kg * (duration_min / 60)
    
    # Create exercise log
    exercise_log = ExerciseLog(
        user_id=current_user.id,
        saved_exercise_id=saved.id if saved else None,
        logged_at=logged_at,
        exercise_name=exercise_description,
        duration=duration_min,
        calories_burned=calories_burned,
        intensity=intensity,
        notes=notes
    )
    
    db.session.add(exercise_log)
    db.session.commit()
    
    return jsonify({
        'id': exercise_log.id,
        'saved_exercise_id': exercise_log.saved_exercise_id,
        'logged_at': exercise_log.logged_at.isoformat(),
        'exercise_name': exercise_log.exercise_name,
        'duration_min': exercise_log.duration,
        'calories_burned': exercise_log.calories_burned,
        'intensity': exercise_log.intensity,
        'notes': exercise_log.notes,
        'estimated_by': 'ai' if 'estimation' in locals() else 'fallback'
    }), 201


@bp.route('/saved', methods=['GET'])
@login_required
def get_saved_exercises():
    """Get user's saved exercises."""
    saved = SavedExercise.query.filter_by(
        user_id=current_user.id
    ).order_by(SavedExercise.name).all()
    
    return jsonify([{
        'id': s.id,
        'name': s.name,
        'description': s.description,
        'muscle_group': s.muscle_group,
        'type': s.type,
        'instructions': s.instructions
    } for s in saved]), 200


@bp.route('/save', methods=['POST'])
@login_required
def save_exercise():
    """Save an exercise for future use."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    name = data.get('name')
    description = data.get('description', '')
    muscle_group = data.get('muscle_group')
    exercise_type = data.get('type')
    instructions = data.get('instructions', '')
    
    if not name:
        return jsonify({'error': 'name is required'}), 400
    
    saved = SavedExercise(
        user_id=current_user.id,
        name=name,
        description=description,
        muscle_group=muscle_group,
        type=exercise_type,
        instructions=instructions
    )
    
    db.session.add(saved)
    db.session.commit()
    
    return jsonify({
        'id': saved.id,
        'name': saved.name,
        'description': saved.description,
        'muscle_group': saved.muscle_group,
        'type': saved.type,
        'instructions': saved.instructions
    }), 201


@bp.route('/estimate', methods=['POST'])
@login_required
def estimate_calories():
    """Estimate calories for an exercise without logging it."""
    data = request.get_json()
    
    if not isinstance(data, dict) or not data:
        return jsonify({'error': 'No data provided'}), 400
    if 'activity_id' in data:
        return _typed_request(data, preview=True)

    exercise_description = data.get('exercise_description')
    duration_min = data.get('duration_min')
    
    if not exercise_description or not duration_min:
        return jsonify({'error': 'exercise_description and duration_min required'}), 400
    
    try:
        if isinstance(duration_min, bool):
            raise ValueError
        duration_min = float(duration_min)
        if not math.isfinite(duration_min) or duration_min <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'error': 'duration_min must be a positive number'}), 400
    
    # Get user's weight from profile
    user_weight = current_user.weight
    
    if not user_weight:
        return jsonify({
            'error': 'User weight not set',
            'message': 'Please set your weight in your profile first'
        }), 400
    
    # Weight is stored in lbs, convert to kg for calorie calculation
    weight_kg = user_weight * 0.453592
    
    # Estimate calories via Qwen AI
    try:
        estimation = qwen_client.estimate_exercise_calories(
            description=exercise_description,
            duration_min=duration_min,
            weight_kg=weight_kg
        )
        calories_burned = estimation['calories']
        method = 'ai'
    except Exception:
        # Fallback calculation
        calories_burned = 5 * weight_kg * (duration_min / 60)
        method = 'fallback'
    
    return jsonify({
        'exercise_description': exercise_description,
        'duration_min': duration_min,
        'calories_burned': calories_burned,
        'estimated_by': method
    })


@bp.route('/logs', methods=['GET'])
@login_required
def get_exercise_logs():
    """Get user's exercise logs."""
    query = ExerciseLog.query.filter_by(user_id=current_user.id)
    try:
        start = _day(request.args['start_date']) if 'start_date' in request.args else None
        end = _day(request.args['end_date']) if 'end_date' in request.args else None
        if start and end and start > end:
            raise ValueError
        if start:
            query = query.filter(ExerciseLog.logged_at >= datetime.combine(start, time.min))
        if end:
            query = query.filter(ExerciseLog.logged_at <= datetime.combine(end, time.max))
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid date range. Use YYYY-MM-DD.'}), 400
    query = query.order_by(ExerciseLog.logged_at.desc(), ExerciseLog.id.desc())
    # Explicit ranges must not silently truncate a diary/export to 50 entries.
    logs = query.all() if start or end else query.limit(50).all()
    
    return jsonify([_serialize(log) for log in logs]), 200


@bp.route('/saved/<int:saved_id>', methods=['DELETE'])
@login_required
def delete_saved_exercise(saved_id):
    """Delete a saved exercise."""
    saved = SavedExercise.query.filter_by(
        id=saved_id,
        user_id=current_user.id
    ).first()
    
    if not saved:
        return jsonify({'error': 'Saved exercise not found'}), 404
    
    db.session.delete(saved)
    db.session.commit()
    
    return jsonify({'message': 'Saved exercise deleted'}), 200


@bp.route('/log/<int:log_id>', methods=['DELETE'])
@bp.route('/<int:log_id>', methods=['DELETE'])
@login_required
def delete_exercise_log(log_id):
    """Delete an exercise log."""
    log = ExerciseLog.query.filter_by(
        id=log_id,
        user_id=current_user.id
    ).first()
    
    if not log:
        return jsonify({'error': 'Exercise log not found'}), 404
    
    db.session.delete(log)
    db.session.commit()
    
    return jsonify({'message': 'Exercise log deleted'}), 200
