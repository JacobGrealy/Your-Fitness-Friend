from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required
from app import db
from app.models.user import User

bp = Blueprint('user', __name__, url_prefix='/user')


@bp.route('/profile', methods=['GET', 'PUT'])
@login_required
def profile():
    """Get or update user profile."""
    if request.method == 'GET':
        user = {
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'age': current_user.age,
            'gender': current_user.gender,
            'height': current_user.height,
            'weight': current_user.weight,
            'activity_level': current_user.activity_level,
            'daily_calorie_goal': current_user.daily_calorie_goal,
            'created_at': current_user.created_at.isoformat()
        }
        return jsonify(user)
    
    elif request.method == 'PUT':
        data = request.get_json()
        
        # Update allowed fields
        if 'age' in data:
            current_user.age = data['age']
        if 'gender' in data:
            current_user.gender = data['gender']
        if 'height' in data:
            current_user.height = data['height']
        if 'weight' in data:
            current_user.weight = data['weight']
        if 'activity_level' in data:
            current_user.activity_level = data['activity_level']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'age': current_user.age,
                'gender': current_user.gender,
                'height': current_user.height,
                'weight': current_user.weight,
                'activity_level': current_user.activity_level,
                'daily_calorie_goal': current_user.daily_calorie_goal
            }
        })


@bp.route('/goal', methods=['PUT'])
@login_required
def update_goal():
    """Update daily calorie goal."""
    data = request.get_json()
    
    if 'daily_calorie_goal' not in data:
        return jsonify({'error': 'daily_calorie_goal is required'}), 400
    
    calorie_goal = data['daily_calorie_goal']
    
    if not isinstance(calorie_goal, int) or calorie_goal < 500:
        return jsonify({'error': 'Calorie goal must be at least 500 calories'}), 400
    
    current_user.daily_calorie_goal = calorie_goal
    db.session.commit()
    
    return jsonify({
        'message': 'Calorie goal updated successfully',
        'daily_calorie_goal': current_user.daily_calorie_goal
    })


@bp.route('/stats', methods=['GET'])
@login_required
def stats():
    """Get user statistics."""
    from app.models import WeightLog, ExerciseLog, FoodLog, MealPhoto
    
    weight_logs_count = WeightLog.query.filter_by(user_id=current_user.id).count()
    exercise_logs_count = ExerciseLog.query.filter_by(user_id=current_user.id).count()
    food_logs_count = FoodLog.query.filter_by(user_id=current_user.id).count()
    meal_photos_count = MealPhoto.query.filter_by(user_id=current_user.id).count()
    
    return jsonify({
        'weight_logs': weight_logs_count,
        'exercise_logs': exercise_logs_count,
        'food_logs': food_logs_count,
        'meal_photos': meal_photos_count
    })
