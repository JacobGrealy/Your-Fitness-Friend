from datetime import datetime, date
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from app.models.weight_log import WeightLog
from app.utils.weight_calculator import calculate_weight_trend, calculate_weight_change

bp = Blueprint('weight', __name__, url_prefix='/api/weight')


@bp.route('/', methods=['GET'])
@login_required
def index():
    """Get weight tracking index."""
    return jsonify({'message': 'Weight tracking'})


@bp.route('/logs', methods=['GET'])
@login_required
def get_logs():
    """Get weight logs for current user with optional date filtering."""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = WeightLog.query.filter_by(user_id=current_user.id)
    
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(WeightLog.recorded_at >= datetime.combine(start, datetime.min.time()))
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(WeightLog.recorded_at <= datetime.combine(end, datetime.max.time()))
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    logs = query.order_by(WeightLog.recorded_at.desc()).all()
    
    result = [{
        'id': log.id,
        'weight_kg': log.weight,
        'date': log.recorded_at.strftime('%Y-%m-%d'),
        'notes': log.notes,
        'photo_url': log.photo_url,
        'recorded_at': log.recorded_at.isoformat()
    } for log in logs]
    
    return jsonify(result)


@bp.route('/logs', methods=['POST'])
@login_required
def create_log():
    """Create a new weight log entry."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    weight_kg = data.get('weight_kg')
    if weight_kg is None:
        return jsonify({'error': 'weight_kg is required'}), 400
    
    try:
        weight_kg = float(weight_kg)
    except (TypeError, ValueError):
        return jsonify({'error': 'weight_kg must be a number'}), 400
    
    if weight_kg <= 0:
        return jsonify({'error': 'weight_kg must be positive'}), 400
    
    date_str = data.get('date')
    if date_str:
        try:
            recorded_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'date must be in YYYY-MM-DD format'}), 400
    else:
        recorded_date = date.today()
    
    notes = data.get('notes', '')
    photo_url = data.get('photo_url')
    
    log = WeightLog(
        user_id=current_user.id,
        weight=weight_kg,
        recorded_at=datetime.combine(recorded_date, datetime.min.time()),
        notes=notes,
        photo_url=photo_url
    )
    
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'id': log.id,
        'weight_kg': log.weight,
        'date': log.recorded_at.strftime('%Y-%m-%d'),
        'notes': log.notes,
        'photo_url': log.photo_url,
        'recorded_at': log.recorded_at.isoformat()
    }), 201


@bp.route('/logs/<int:log_id>', methods=['GET'])
@login_required
def get_log(log_id):
    """Get a specific weight log entry."""
    log = WeightLog.query.filter_by(id=log_id, user_id=current_user.id).first()
    
    if not log:
        return jsonify({'error': 'Weight log not found'}), 404
    
    return jsonify({
        'id': log.id,
        'weight_kg': log.weight,
        'date': log.recorded_at.strftime('%Y-%m-%d'),
        'notes': log.notes,
        'photo_url': log.photo_url,
        'recorded_at': log.recorded_at.isoformat()
    })


@bp.route('/logs/<int:log_id>', methods=['PUT'])
@login_required
def update_log(log_id):
    """Update a weight log entry."""
    log = WeightLog.query.filter_by(id=log_id, user_id=current_user.id).first()
    
    if not log:
        return jsonify({'error': 'Weight log not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'weight_kg' in data:
        try:
            weight_kg = float(data['weight_kg'])
            if weight_kg <= 0:
                return jsonify({'error': 'weight_kg must be positive'}), 400
            log.weight = weight_kg
        except (TypeError, ValueError):
            return jsonify({'error': 'weight_kg must be a number'}), 400
    
    if 'date' in data:
        try:
            recorded_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            log.recorded_at = datetime.combine(recorded_date, datetime.min.time())
        except ValueError:
            return jsonify({'error': 'date must be in YYYY-MM-DD format'}), 400
    
    if 'notes' in data:
        log.notes = data['notes']
    
    if 'photo_url' in data:
        log.photo_url = data['photo_url']
    
    db.session.commit()
    
    return jsonify({
        'id': log.id,
        'weight_kg': log.weight,
        'date': log.recorded_at.strftime('%Y-%m-%d'),
        'notes': log.notes,
        'photo_url': log.photo_url,
        'recorded_at': log.recorded_at.isoformat()
    })


@bp.route('/logs/<int:log_id>', methods=['DELETE'])
@login_required
def delete_log(log_id):
    """Delete a weight log entry."""
    log = WeightLog.query.filter_by(id=log_id, user_id=current_user.id).first()
    
    if not log:
        return jsonify({'error': 'Weight log not found'}), 404
    
    db.session.delete(log)
    db.session.commit()
    
    return jsonify({'message': 'Weight log deleted successfully'})


@bp.route('/stats', methods=['GET'])
@login_required
def get_stats():
    """Get weight statistics and trends."""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = WeightLog.query.filter_by(user_id=current_user.id)
    
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(WeightLog.recorded_at >= datetime.combine(start, datetime.min.time()))
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(WeightLog.recorded_at <= datetime.combine(end, datetime.max.time()))
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    logs = query.order_by(WeightLog.recorded_at).all()
    
    if len(logs) < 2:
        return jsonify({
            'entries': len(logs),
            'average_weight': logs[0].weight if logs else None,
            'first_weight': logs[0].weight if logs else None,
            'last_weight': logs[-1].weight if logs else None,
            'weight_change': 0,
            'weight_change_percentage': 0
        })
    
    first_weight = logs[0].weight
    last_weight = logs[-1].weight
    weight_change = last_weight - first_weight
    weight_change_percentage = (weight_change / first_weight) * 100 if first_weight > 0 else 0
    
    avg_weight, avg_weight_period = calculate_weight_trend(logs)
    first_date = logs[0].recorded_at.strftime('%Y-%m-%d')
    last_date = logs[-1].recorded_at.strftime('%Y-%m-%d')
    
    return jsonify({
        'entries': len(logs),
        'average_weight': round(avg_weight, 2),
        'average_weight_period': avg_weight_period,
        'first_weight': round(first_weight, 2),
        'first_date': first_date,
        'last_weight': round(last_weight, 2),
        'last_date': last_date,
        'weight_change': round(weight_change, 2),
        'weight_change_percentage': round(weight_change_percentage, 2)
    })
