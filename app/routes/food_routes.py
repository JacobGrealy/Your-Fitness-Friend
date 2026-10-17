import os
import uuid

from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_login import login_required, current_user
from app.models.food import Food
from app.models.food_log import FoodLog
from app.config import Config
from app import db
from datetime import datetime, date, timedelta


bp = Blueprint('food', __name__)

FOOD_LOG_PHOTO_FOLDER = 'food_log_photos'


def _uploads_root():
    """Absolute path to the uploads directory.

    Honours UPLOAD_FOLDER so tests (and alternate deployments) can relocate it
    instead of writing into app/uploads.
    """
    configured = current_app.config.get('UPLOAD_FOLDER')
    if configured:
        return os.path.abspath(configured)
    return os.path.abspath(os.path.join(current_app.root_path, 'uploads'))


def _food_log_photo_dir():
    """Absolute path to the directory holding food log photos."""
    return os.path.join(_uploads_root(), FOOD_LOG_PHOTO_FOLDER)


def _has_allowed_extension(filename):
    """Whether a filename carries an extension allowed for food log photos."""
    if '.' not in filename:
        return False
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in Config.ALLOWED_EXTENSIONS.get('food_log_photos', set())


def _remove_photo_file(photo_url):
    """Delete a stored photo, ignoring anything outside the uploads directory."""
    if not photo_url:
        return
    uploads_root = _uploads_root()
    target = os.path.abspath(os.path.join(uploads_root, photo_url))
    if not target.startswith(uploads_root + os.sep):
        return
    try:
        os.remove(target)
    except OSError:
        pass


def _sync_linked_food(log):
    """Copy edited nutrition onto the linked Food record.

    Other logs referencing the same food are deliberately left alone: each log
    keeps its own nutrition snapshot, per the Edit Food Log design.
    """
    if not log.food_id:
        return

    food = Food.query.filter_by(id=log.food_id, user_id=current_user.id).first()
    if not food:
        return

    food.name = log.food_name
    food.calories = log.calories
    food.protein_g = log.protein_g
    food.carbs_g = log.carbs_g
    food.fat_g = log.fat_g
    food.serving_size = log.serving_size
    if log.brand is not None:
        food.brand = log.brand
    if log.barcode_id is not None:
        food.barcode_id = log.barcode_id


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
        'serving_size': f.serving_size,
        'brand': f.brand,
        'barcode_id': f.barcode_id,
    } for f in foods]), 200


@bp.route('/recent', methods=['GET'])
@login_required
def get_recent_foods():
    """Get user's recently logged foods, using Food as source of truth."""
    days = request.args.get('days', 7, type=int)
    cutoff_date = datetime.now().date() - timedelta(days=days)

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
                # logs are ordered newest first, so the first photo encountered
                # is the most recent one for this food
                'photo_url': log.photo_url or None,
            }
        elif grouped[key]['photo_url'] is None and log.photo_url:
            grouped[key]['photo_url'] = log.photo_url
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
                'photo_url': data['photo_url'],
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
    serving_size = data.get('serving_size')
    
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
            food.serving_size = serving_size
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
            serving_size=serving_size,
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
        'serving_size': food.serving_size,
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
            'number_of_servings': log.number_of_servings,
            'photo_url': log.photo_url,
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
    number_of_servings = data.get('number_of_servings')
    photo_url = data.get('photo_url')
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
    
    if number_of_servings is not None:
        try:
            number_of_servings = float(number_of_servings)
            if number_of_servings <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return jsonify({'error': 'number_of_servings must be a positive number'}), 400
    
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
            if serving_size is not None:
                food.serving_size = serving_size
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
        number_of_servings=number_of_servings,
        photo_url=photo_url,
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
        'number_of_servings': food_log.number_of_servings,
        'photo_url': food_log.photo_url,
        'brand': food_log.brand,
        'barcode_id': food_log.barcode_id,
        'date': food_log.date.isoformat(),
        'meal_type': food_log.meal_type
    }), 201


@bp.route('/log/<int:log_id>', methods=['GET'])
@login_required
def get_food_log(log_id):
    """Get a single food log entry.

    Scoped to the current user, and another user's log returns 404 rather than
    403 so the endpoint does not reveal whether the id exists.
    """
    log = FoodLog.query.filter_by(
        id=log_id,
        user_id=current_user.id
    ).first()

    if not log:
        return jsonify({'error': 'Food log not found'}), 404

    return jsonify(log.to_dict()), 200


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

    data = request.get_json() or {}

    valid_meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
    if data.get('meal_type') is not None and data['meal_type'] not in valid_meal_types:
        return jsonify(
            {'error': f'meal_type must be one of: {", ".join(valid_meal_types)}'}
        ), 400

    try:
        if data.get('calories') is not None:
            calories = int(data['calories'])
            if calories <= 0:
                raise ValueError
            log.calories = calories
        if data.get('protein_g') is not None:
            log.protein_g = float(data['protein_g'])
        if data.get('carbs_g') is not None:
            log.carbs_g = float(data['carbs_g'])
        if data.get('fat_g') is not None:
            log.fat_g = float(data['fat_g'])
        if data.get('number_of_servings') is not None:
            number_of_servings = float(data['number_of_servings'])
            if number_of_servings <= 0:
                raise ValueError
            log.number_of_servings = number_of_servings
        if data.get('date') is not None:
            log.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return jsonify({
            'error': 'calories must be a positive integer, number_of_servings a '
                     'positive number, and date must be YYYY-MM-DD'
        }), 400

    if data.get('food_name') is not None:
        log.food_name = data['food_name']
    if data.get('meal_type') is not None:
        log.meal_type = data['meal_type']
    if data.get('serving_size') is not None:
        log.serving_size = data['serving_size']
    if data.get('brand') is not None:
        log.brand = data['brand']
    if data.get('barcode_id') is not None:
        log.barcode_id = data['barcode_id']
    if data.get('photo_url') is not None:
        log.photo_url = data['photo_url']

    _sync_linked_food(log)

    db.session.commit()
    current_app.logger.info(
        f"Update food log: log_id={log_id} name={log.food_name} "
        f"cal={log.calories} date={log.date}"
    )

    return jsonify(log.to_dict()), 200


@bp.route('/log/<int:log_id>/photo', methods=['POST'])
@login_required
def upload_food_log_photo(log_id):
    """Attach or replace the photo on a food log entry."""
    log = FoodLog.query.filter_by(
        id=log_id,
        user_id=current_user.id
    ).first()
    if not log:
        return jsonify({'error': 'Food log not found'}), 404

    if 'photo' not in request.files:
        return jsonify({'error': 'No photo provided'}), 400

    file = request.files['photo']
    if not file.filename:
        return jsonify({'error': 'No photo selected'}), 400
    if not _has_allowed_extension(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400

    extension = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{extension}"
    photo_dir = _food_log_photo_dir()
    os.makedirs(photo_dir, exist_ok=True)
    file.save(os.path.join(photo_dir, filename))

    # Replace any previous photo so old files don't accumulate
    _remove_photo_file(log.photo_url)

    log.photo_url = f"{FOOD_LOG_PHOTO_FOLDER}/{filename}"
    db.session.commit()

    return jsonify({'id': log.id, 'photo_url': log.photo_url}), 200


@bp.route('/log/<int:log_id>/photo', methods=['DELETE'])
@login_required
def delete_food_log_photo(log_id):
    """Remove the photo from a food log entry."""
    log = FoodLog.query.filter_by(
        id=log_id,
        user_id=current_user.id
    ).first()
    if not log:
        return jsonify({'error': 'Food log not found'}), 404

    if not log.photo_url:
        return jsonify({'error': 'Food log has no photo'}), 404

    _remove_photo_file(log.photo_url)
    log.photo_url = None
    db.session.commit()

    return jsonify({'message': 'Photo deleted', 'id': log.id}), 200


@bp.route('/uploads/<path:filename>')
@login_required
def serve_food_log_upload(filename):
    """Serve an uploaded food log photo.

    ``photo_url`` is stored relative to the uploads root (e.g.
    ``food_log_photos/<file>.jpg``), so resolve against that root.
    """
    return send_from_directory(_uploads_root(), filename)


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
