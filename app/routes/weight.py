from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_login import login_required, current_user
from app import db
from app.models.weight_log import WeightLog
from app.utils.weight_calculator import calculate_weight_trend, calculate_weight_change
from app.config import Config
import os
import uuid

bp = Blueprint('weight', __name__)


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
        'weight_lbs': log.weight,
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
    
    weight_lbs = data.get('weight_lbs') or data.get('weight')
    if weight_lbs is None:
        return jsonify({'error': 'weight is required'}), 400
    
    try:
        weight_lbs = float(weight_lbs)
    except (TypeError, ValueError):
        return jsonify({'error': 'weight must be a number'}), 400
    
    if weight_lbs <= 0:
        return jsonify({'error': 'weight must be positive'}), 400
    
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
        weight=weight_lbs,
        recorded_at=datetime.combine(recorded_date, datetime.min.time()),
        notes=notes,
        photo_url=photo_url
    )
    
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'id': log.id,
        'weight_lbs': log.weight,
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
        'weight_lbs': log.weight,
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
    
    if 'weight_lbs' in data or 'weight' in data:
        try:
            weight_lbs = float(data.get('weight_lbs') or data.get('weight'))
            if weight_lbs <= 0:
                return jsonify({'error': 'weight must be positive'}), 400
            log.weight = weight_lbs
        except (TypeError, ValueError):
            return jsonify({'error': 'weight must be a number'}), 400
    
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
        'weight_lbs': log.weight,
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


def allowed_weight_file(filename):
    if '.' not in filename:
        return False
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in Config.ALLOWED_EXTENSIONS.get('meal_photos', set())


@bp.route('/photo', methods=['POST'])
@login_required
def upload_photo():
    """Upload a photo for weight tracking."""
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo provided'}), 400

    file = request.files['photo']
    if file.filename == '' or not allowed_weight_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400

    extension = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{extension}"
    upload_folder = os.path.join(current_app.root_path, 'uploads', 'weight_photos')
    os.makedirs(upload_folder, exist_ok=True)
    filepath = os.path.join(upload_folder, unique_filename)
    file.save(filepath)

    photo_url = f"weight_photos/{unique_filename}"
    return jsonify({'photo_url': photo_url}), 201


@bp.route('/uploads/<path:filename>')
@login_required
def serve_upload(filename):
    """Serve an uploaded weight photo."""
    upload_folder = os.path.join(current_app.root_path, 'uploads', 'weight_photos')
    filepath = os.path.join(upload_folder, filename)
    if os.path.exists(filepath):
        return send_file(filepath)
    return jsonify({'error': 'File not found'}), 404


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


@bp.route('/statistics', methods=['GET'])
@login_required
def get_statistics():
    """Get weight statistics."""
    logs = WeightLog.query.filter_by(user_id=current_user.id)\
        .order_by(WeightLog.recorded_at.desc()).all()

    if not logs:
        return jsonify({
            'current_weight': None,
            'average_weight': None,
            'min_weight': None,
            'max_weight': None,
            'count': 0
        })

    weights = [log.weight for log in logs]
    return jsonify({
        'current_weight': round(logs[0].weight, 2),
        'average_weight': round(sum(weights) / len(weights), 2),
        'min_weight': round(min(weights), 2),
        'max_weight': round(max(weights), 2),
        'count': len(logs)
    })


@bp.route('/trend', methods=['GET'])
@login_required
def get_trend():
    """Get weight trend analysis."""
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    all_logs = WeightLog.query.filter_by(user_id=current_user.id)\
        .order_by(WeightLog.recorded_at.desc()).all()

    if not all_logs:
        return jsonify({
            'current_weight': None,
            'previous_weight': None,
            'change_7d': None,
            'change_30d': None,
            'trend': None
        })

    current_weight = all_logs[0].weight

    week_logs = [l for l in all_logs if l.recorded_at >= week_ago]
    month_logs = [l for l in all_logs if l.recorded_at >= month_ago]

    change_7d = None
    change_30d = None

    if len(week_logs) >= 2:
        change_7d = round(current_weight - week_logs[-1].weight, 2)
    elif len(week_logs) == 1 and len(all_logs) >= 2:
        change_7d = round(current_weight - all_logs[1].weight, 2)

    if len(month_logs) >= 2:
        change_30d = round(current_weight - month_logs[-1].weight, 2)
    elif len(month_logs) == 1 and len(all_logs) >= 2:
        change_30d = round(current_weight - all_logs[1].weight, 2)

    trend = None
    if change_7d is not None:
        if change_7d > 0.1:
            trend = 'up'
        elif change_7d < -0.1:
            trend = 'down'
        else:
            trend = 'stable'

    previous_weight = all_logs[1].weight if len(all_logs) >= 2 else None

    return jsonify({
        'current_weight': round(current_weight, 2),
        'previous_weight': round(previous_weight, 2) if previous_weight else None,
        'change_7d': change_7d,
        'change_30d': change_30d,
        'trend': trend
    })
