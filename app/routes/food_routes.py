from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app.models.food import Food
from app.models.food_log import FoodLog
from app import db
from datetime import datetime, date, timedelta


bp = Blueprint('food', __name__)


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
        'fat_g': f.fat_g,
        'brand': f.brand,
        'barcode_id': f.barcode_id,
    } for f in foods]), 200


@bp.route('/recent', methods=['GET'])
@login_required
def get_recent_foods():
    """Get user's recently logged foods, using Food as source of truth."""
    days = request.args.get('days', 7, type=int)
    cutoff_date = datetime.utcnow().date() - timedelta(days=days)

    logs = FoodLog.query.filter(
        FoodLog.user_id == current_user.id,
        FoodLog.date >= cutoff_date,
        FoodLog.food_id.isnot(None)
    ).order_by(FoodLog.id.desc()).all()

    # Group by food_id: count logs, track most recent date
    # Since logs are ordered by id desc, the first log per food_id is the most recent
    grouped = {}
    for log in logs:
        key = log.food_id
        if key not in grouped:
            grouped[key] = {
                'total_logs': 0,
                'last_logged': log.date,
                'serving_size': log.serving_size,
            }
        grouped[key]['total_logs'] += 1

    # Get Food records for all food_ids
    food_ids = [fid for fid in grouped.keys()]
    foods = Food.query.filter(Food.id.in_(food_ids)).all()
    food_lookup = {f.id: f for f in foods}

    result = []
    for food_id, data in grouped.items():
        food = food_lookup.get(food_id)
        if food:
            result.append({
                'food_name': food.name,
                'food_id': food_id,
                'calories': food.calories,
                'protein_g': food.protein_g,
                'carbs_g': food.carbs_g,
                'fat_g': food.fat_g,
                'serving_size': data['serving_size'],
                'brand': food.brand,
                'barcode_id': food.barcode_id,
                'total_logs': data['total_logs'],
                'last_logged': data['last_logged'].isoformat(),
            })

    # Sort by last_logged descending
    result.sort(key=lambda x: x['last_logged'], reverse=True)

    return jsonify(result), 200


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
    brand = data.get('brand')
    barcode_id = data.get('barcode_id')
    
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
    
    food_id = data.get('food_id')
    
    if food_id:
        food = Food.query.filter_by(
            id=int(food_id),
            user_id=current_user.id
        ).first()
        if food:
            food.name = name
            food.calories = calories
            food.protein_g = protein_g
            food.carbs_g = carbs_g
            food.fat_g = fat_g
            food.brand = brand
            food.barcode_id = barcode_id
    else:
        food = Food(
            user_id=current_user.id,
            name=name,
            calories=calories,
            protein_g=protein_g,
            carbs_g=carbs_g,
            fat_g=fat_g,
            brand=brand,
            barcode_id=barcode_id
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
        'fat_g': food.fat_g,
        'brand': food.brand,
        'barcode_id': food.barcode_id
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
            'meal_type': log.meal_type,
            'brand': log.brand,
            'food_id': log.food_id,
            'serving_size': log.serving_size,
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
    brand = data.get('brand')
    barcode_id = data.get('barcode_id')
    serving_size = data.get('serving_size')
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
    
    # Get brand/barcode_id from food reference or request data
    brand = None
    barcode_id = None
    if data.get('food_id'):
        food = Food.query.filter_by(
            id=int(data['food_id']),
            user_id=current_user.id
        ).first()
        if food:
            food.name = data.get('food_name', food.name)
            food.calories = data.get('calories', food.calories)
            food.protein_g = data.get('protein_g', food.protein_g)
            food.carbs_g = data.get('carbs_g', food.carbs_g)
            food.fat_g = data.get('fat_g', food.fat_g)
            food.brand = data.get('brand', food.brand)
            food.barcode_id = data.get('barcode_id', food.barcode_id)
            db.session.commit()
            brand = food.brand
            barcode_id = food.barcode_id
    else:
        brand = data.get('brand')
        barcode_id = data.get('barcode_id')
    
    food_log = FoodLog(
        user_id=current_user.id,
        food_id=data.get('food_id'),
        food_name=food_name,
        calories=calories,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g,
        serving_size=serving_size,
        brand=brand,
        barcode_id=barcode_id,
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
        'serving_size': food_log.serving_size,
        'brand': food_log.brand,
        'barcode_id': food_log.barcode_id,
        'date': food_log.date.isoformat(),
        'meal_type': food_log.meal_type
    }), 201


@bp.route('/log/<int:log_id>', methods=['DELETE'])
@login_required
def delete_food_log(log_id):
    """Delete a food log entry and orphaned food items."""
    log = FoodLog.query.filter_by(
        id=log_id,
        user_id=current_user.id
    ).first()
    
    if not log:
        return jsonify({'error': 'Food log not found'}), 404
    
    food_name = log.food_name
    db.session.delete(log)
    db.session.commit()
    
    remaining = FoodLog.query.filter_by(
        user_id=current_user.id,
        food_name=food_name
    ).first()
    
    if not remaining:
        food = Food.query.filter_by(
            user_id=current_user.id,
            name=food_name
        ).first()
        if food:
            db.session.delete(food)
            db.session.commit()
    
    return jsonify({'message': 'Food log deleted'}), 200


@bp.route('/log/<int:log_id>', methods=['PUT'])
@login_required
def update_food_log(log_id):
    """Update a food log entry."""
    log = FoodLog.query.filter_by(
        id=log_id,
        user_id=current_user.id
    ).first()
    
    if not log:
        return jsonify({'error': 'Food log not found'}), 404
    
    data = request.get_json()
    
    if data.get('food_name') is not None:
        log.food_name = data['food_name']
    if data.get('calories') is not None:
        log.calories = int(data['calories'])
    if data.get('protein_g') is not None:
        log.protein_g = float(data['protein_g'])
    if data.get('carbs_g') is not None:
        log.carbs_g = float(data['carbs_g'])
    if data.get('fat_g') is not None:
        log.fat_g = float(data['fat_g'])
    if data.get('meal_type') is not None:
        log.meal_type = data['meal_type']
    if data.get('serving_size') is not None:
        log.serving_size = data['serving_size']
    if data.get('brand') is not None:
        log.brand = data['brand']
    
    db.session.commit()
    
    return jsonify({
        'id': log.id,
        'food_name': log.food_name,
        'calories': log.calories,
        'protein_g': log.protein_g,
        'carbs_g': log.carbs_g,
        'fat_g': log.fat_g,
        'serving_size': log.serving_size,
        'brand': log.brand,
        'date': log.date.isoformat(),
        'meal_type': log.meal_type
    }), 200


@bp.route('/daily', methods=['GET'])
@login_required
def get_daily_totals():
    """Get daily nutritional totals."""
    date_param = request.args.get('date')
    
    if date_param:
        try:
            target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    else:
        target_date = date.today()
    
    logs = FoodLog.query.filter_by(
        user_id=current_user.id,
        date=target_date
    ).all()
    
    total_calories = sum(log.calories for log in logs)
    total_protein = sum(log.protein_g for log in logs)
    total_carbs = sum(log.carbs_g for log in logs)
    total_fat = sum(log.fat_g for log in logs)
    
    calorie_goal = current_user.daily_calorie_goal or 2000
    calories_remaining = calorie_goal - total_calories
    
    return jsonify({
        'total_calories': total_calories,
        'total_protein': round(total_protein, 1),
        'total_carbs': round(total_carbs, 1),
        'total_fat': round(total_fat, 1),
        'calorie_goal': calorie_goal,
        'calories_remaining': calories_remaining,
    }), 200


@bp.route('/macro-goals', methods=['GET'])
@login_required
def get_macro_goals():
    """Get macro goals computed from calorie goal."""
    calorie_goal = current_user.daily_calorie_goal or 2000
    protein = round(calorie_goal * 0.30 / 4)
    carbs = round(calorie_goal * 0.40 / 4)
    fat = round(calorie_goal * 0.30 / 9)
    return jsonify({
        'protein': protein,
        'carbs': carbs,
        'fat': fat,
    }), 200


@bp.route('/macro-goals', methods=['PUT'])
@login_required
def set_macro_goals():
    """Update calorie goal (macro goals are computed from it)."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'calorie_goal' in data:
        current_user.daily_calorie_goal = int(data['calorie_goal'])
        db.session.commit()
    
    calorie_goal = current_user.daily_calorie_goal or 2000
    protein = round(calorie_goal * 0.30 / 4)
    carbs = round(calorie_goal * 0.40 / 4)
    fat = round(calorie_goal * 0.30 / 9)
    return jsonify({
        'protein': protein,
        'carbs': carbs,
        'fat': fat,
    }), 200
