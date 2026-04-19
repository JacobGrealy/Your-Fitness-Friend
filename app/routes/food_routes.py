from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app.models.food import Food
from app.models.food_log import FoodLog
from app import db
from datetime import datetime, date


bp = Blueprint('food', __name__, url_prefix='/api/food')


@bp.route('', methods=['GET'])
@login_required
def get_foods():
    """Search and get foods (user's foods + shared foods)."""
    search_query = request.args.get('q', '').strip()
    
    if search_query:
        foods = Food.query.filter(
            db.or_(
                Food.name.ilike(f'%{search_query}%'),
                Food.user_id.is_(None)
            )
        ).limit(20).all()
    else:
        foods = Food.query.filter(
            db.or_(
                Food.user_id == current_user.id,
                Food.user_id.is_(None)
            )
        ).limit(20).all()
    
    return jsonify([{
        'id': f.id,
        'user_id': f.user_id,
        'name': f.name,
        'calories': f.calories,
        'protein_g': f.protein_g,
        'carbs_g': f.carbs_g,
        'fat_g': f.fat_g
    } for f in foods]), 200


@bp.route('', methods=['POST'])
@login_required
def create_food():
    """Create a custom food entry."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    name = data.get('name')
    calories = data.get('calories')
    protein_g = data.get('protein_g', 0.0)
    carbs_g = data.get('carbs_g', 0.0)
    fat_g = data.get('fat_g', 0.0)
    
    if not name or calories is None:
        return jsonify({'error': 'name and calories are required'}), 400
    
    try:
        calories = int(calories)
        protein_g = float(protein_g)
        carbs_g = float(carbs_g)
        fat_g = float(fat_g)
        
        if calories <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'error': 'calories must be a positive integer'}), 400
    
    food = Food(
        user_id=current_user.id,
        name=name,
        calories=calories,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g
    )
    
    db.session.add(food)
    db.session.commit()
    
    return jsonify({
        'id': food.id,
        'user_id': food.user_id,
        'name': food.name,
        'calories': food.calories,
        'protein_g': food.protein_g,
        'carbs_g': food.carbs_g,
        'fat_g': food.fat_g
    }), 201


@bp.route('/log', methods=['GET'])
@login_required
def get_food_logs():
    """Get food logs for user on specified date."""
    date_param = request.args.get('date')
    
    if date_param:
        try:
            log_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    else:
        log_date = date.today()
    
    logs = FoodLog.query.filter_by(
        user_id=current_user.id,
        date=log_date
    ).order_by(FoodLog.meal_type).all()
    
    total_calories = sum(log.calories for log in logs)
    total_protein = sum(log.protein_g for log in logs)
    total_carbs = sum(log.carbs_g for log in logs)
    total_fat = sum(log.fat_g for log in logs)
    
    return jsonify({
        'date': log_date.isoformat(),
        'logs': [{
            'id': log.id,
            'food_name': log.food_name,
            'calories': log.calories,
            'protein_g': log.protein_g,
            'carbs_g': log.carbs_g,
            'fat_g': log.fat_g,
            'meal_type': log.meal_type
        } for log in logs],
        'totals': {
            'total_calories': total_calories,
            'total_protein': total_protein,
            'total_carbs': total_carbs,
            'total_fat': total_fat
        }
    }), 200


@bp.route('/log', methods=['POST'])
@login_required
def create_food_log():
    """Add food entry to daily log."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    food_name = data.get('food_name')
    calories = data.get('calories')
    protein_g = data.get('protein_g', 0.0)
    carbs_g = data.get('carbs_g', 0.0)
    fat_g = data.get('fat_g', 0.0)
    date_param = data.get('date')
    meal_type = data.get('meal_type')
    
    if not food_name or calories is None or not date_param or not meal_type:
        return jsonify({'error': 'food_name, calories, date, and meal_type are required'}), 400
    
    valid_meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
    if meal_type not in valid_meal_types:
        return jsonify({'error': f'meal_type must be one of: {", ".join(valid_meal_types)}'}), 400
    
    try:
        calories = int(calories)
        protein_g = float(protein_g)
        carbs_g = float(carbs_g)
        fat_g = float(fat_g)
        log_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        
        if calories <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({'error': 'calories must be a positive integer and date must be YYYY-MM-DD'}), 400
    
    food_log = FoodLog(
        user_id=current_user.id,
        food_name=food_name,
        calories=calories,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g,
        date=log_date,
        meal_type=meal_type
    )
    
    db.session.add(food_log)
    db.session.commit()
    
    return jsonify({
        'id': food_log.id,
        'food_name': food_log.food_name,
        'calories': food_log.calories,
        'protein_g': food_log.protein_g,
        'carbs_g': food_log.carbs_g,
        'fat_g': food_log.fat_g,
        'date': food_log.date.isoformat(),
        'meal_type': food_log.meal_type
    }), 201


@bp.route('/log/<int:log_id>', methods=['DELETE'])
@login_required
def delete_food_log(log_id):
    """Delete a food log entry."""
    log = FoodLog.query.filter_by(
        id=log_id,
        user_id=current_user.id
    ).first()
    
    if not log:
        return jsonify({'error': 'Food log not found'}), 404
    
    db.session.delete(log)
    db.session.commit()
    
    return jsonify({'message': 'Food log deleted'}), 200
