from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app.models.exercise_log import ExerciseLog
from app.models.saved_exercise import SavedExercise
from app.utils.qwen_client import qwen_client
from app import db
from datetime import datetime

bp = Blueprint('exercise', __name__, url_prefix='/api/exercise')


@bp.route('/log', methods=['POST'])
@login_required
def log_exercise():
    """Log an exercise with AI-calorie estimation."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    exercise_description = data.get('exercise_description')
    duration_min = data.get('duration_min')
    
    if not exercise_description or not duration_min:
        return jsonify({'error': 'exercise_description and duration_min required'}), 400
    
    try:
        duration_min = float(duration_min)
        if duration_min <= 0:
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
    
    # Convert weight to kg if in lbs
    if current_user.unit == 'imperial':
        weight_kg = user_weight * 0.453592
    else:
        weight_kg = user_weight
    
    # Estimate calories via Qwen AI
    try:
        estimation = qwen_client.estimate_exercise_calories(
            description=exercise_description,
            duration_min=duration_min,
            weight_kg=weight_kg
        )
        calories_burned = estimation['calories']
    except Exception as e:
        # Fallback: use simple calculation if AI fails
        # Basic estimate: MET * weight_kg * duration_hours
        # Using average MET of 5 for moderate exercise
        calories_burned = 5 * weight_kg * (duration_min / 60)
    
    # Create exercise log
    exercise_log = ExerciseLog(
        user_id=current_user.id,
        exercise_name=exercise_description,
        duration=duration_min,
        calories_burned=calories_burned
    )
    
    db.session.add(exercise_log)
    db.session.commit()
    
    return jsonify({
        'id': exercise_log.id,
        'exercise_name': exercise_log.exercise_name,
        'duration_min': exercise_log.duration,
        'calories_burned': exercise_log.calories_burned,
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
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    exercise_description = data.get('exercise_description')
    duration_min = data.get('duration_min')
    
    if not exercise_description or not duration_min:
        return jsonify({'error': 'exercise_description and duration_min required'}), 400
    
    try:
        duration_min = float(duration_min)
        if duration_min <= 0:
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
    
    # Convert weight to kg if in lbs
    if current_user.unit == 'imperial':
        weight_kg = user_weight * 0.453592
    else:
        weight_kg = user_weight
    
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
    logs = ExerciseLog.query.filter_by(
        user_id=current_user.id
    ).order_by(ExerciseLog.logged_at.desc()).limit(50).all()
    
    return jsonify([{
        'id': log.id,
        'exercise_name': log.exercise_name,
        'duration_min': log.duration,
        'calories_burned': log.calories_burned,
        'intensity': log.intensity,
        'notes': log.notes,
        'logged_at': log.logged_at.isoformat()
    } for log in logs]), 200


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
