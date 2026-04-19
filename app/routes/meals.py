from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from app.models.meal_photo import MealPhoto
from app.utils.qwen_client import qwen_client
from app.config import Config
import os
import base64
import uuid


bp = Blueprint('meals', __name__, url_prefix='/api/meals')


def allowed_file(filename):
    """Check if file extension is allowed."""
    if '.' not in filename:
        return False
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in Config.ALLOWED_EXTENSIONS.get('meal_photos', set())


def generate_unique_filename(original_filename):
    """Generate a unique filename for uploaded files."""
    extension = original_filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{extension}"
    return unique_filename


def save_uploaded_file(file, upload_folder):
    """Save uploaded file and return relative path."""
    if not allowed_file(file.filename):
        return None, "Invalid file type. Only JPG and PNG are allowed."
    
    if file.content_length and file.content_length > Config.MAX_CONTENT_LENGTH:
        return None, "File too large. Maximum size is 10MB."
    
    unique_filename = generate_unique_filename(file.filename)
    filepath = os.path.join(upload_folder, unique_filename)
    
    # Ensure directory exists
    os.makedirs(upload_folder, exist_ok=True)
    
    try:
        file.save(filepath)
        return f"meal_photos/{unique_filename}", None
    except Exception as e:
        return None, f"Error saving file: {str(e)}"


def encode_file_to_base64(filepath):
    """Encode image file to base64 string."""
    try:
        with open(filepath, 'rb') as f:
            image_data = f.read()
        return base64.b64encode(image_data).decode('utf-8')
    except Exception as e:
        raise ValueError(f"Error reading image file: {str(e)}")


@bp.route('/photo', methods=['POST'])
@login_required
def upload_photo():
    """
    Upload meal photo and get AI nutrition analysis.
    
    Expects:
        - photo: Image file (multipart/form-data)
    
    Returns:
        Analysis results with estimated nutrition
    """
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo provided'}), 400
    
    file = request.files['photo']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Save file
    upload_folder = os.path.join(
        current_app.root_path,
        'uploads',
        'meal_photos'
    )
    
    photo_path, error = save_uploaded_file(file, upload_folder)
    if error:
        return jsonify({'error': error}), 400
    
    # Read and encode file
    full_path = os.path.join(current_app.root_path, 'uploads', photo_path)
    try:
        image_base64 = encode_file_to_base64(full_path)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    # Analyze with AI
    try:
        analysis = qwen_client.analyze_meal_photo(image_base64)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422
    except Exception as e:
        return jsonify({'error': f"AI analysis failed: {str(e)}"}), 422
    
    # Create database record
    meal_photo = MealPhoto(
        user_id=current_user.id,
        photo_path=photo_path,
        estimated_calories=int(analysis['calories']),
        estimated_protein=analysis['protein'],
        estimated_carbs=analysis['carbs'],
        estimated_fat=analysis['fat'],
        date=None
    )
    db.session.add(meal_photo)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'photo_id': meal_photo.id,
        'photo_path': photo_path,
        'analysis': {
            'calories': analysis['calories'],
            'protein': analysis['protein'],
            'carbs': analysis['carbs'],
            'fat': analysis['fat'],
            'items': analysis['items']
        }
    }), 200


@bp.route('/', methods=['GET'])
@login_required
def get_meal_photos():
    """
    Get all meal photos for current user.
    
    Query params:
        - limit: Maximum number of results (default: 50)
        - offset: Number of results to skip (default: 0)
    """
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    if limit > 100:
        limit = 100
    
    photos = MealPhoto.query.filter_by(user_id=current_user.id)\
        .order_by(MealPhoto.created_at.desc())\
        .offset(offset).limit(limit).all()
    
    return jsonify({
        'photos': [{
            'id': photo.id,
            'photo_path': photo.photo_path,
            'estimated_calories': photo.estimated_calories,
            'estimated_protein': photo.estimated_protein,
            'estimated_carbs': photo.estimated_carbs,
            'estimated_fat': photo.estimated_fat,
            'date': photo.date.isoformat() if photo.date else None,
            'created_at': photo.created_at.isoformat()
        } for photo in photos]
    }), 200


@bp.route('/<int:photo_id>', methods=['GET'])
@login_required
def get_meal_photo(photo_id):
    """
    Get a specific meal photo by ID.
    """
    photo = MealPhoto.query.filter_by(
        id=photo_id,
        user_id=current_user.id
    ).first_or_404()
    
    return jsonify({
        'id': photo.id,
        'photo_path': photo.photo_path,
        'estimated_calories': photo.estimated_calories,
        'estimated_protein': photo.estimated_protein,
        'estimated_carbs': photo.estimated_carbs,
        'estimated_fat': photo.estimated_fat,
        'date': photo.date.isoformat() if photo.date else None,
        'created_at': photo.created_at.isoformat()
    }), 200


@bp.route('/<int:photo_id>', methods=['DELETE'])
@login_required
def delete_meal_photo(photo_id):
    """
    Delete a meal photo.
    """
    photo = MealPhoto.query.filter_by(
        id=photo_id,
        user_id=current_user.id
    ).first_or_404()
    
    # Delete file from filesystem
    if photo.photo_path:
        file_path = os.path.join(
            current_app.root_path,
            'uploads',
            photo.photo_path
        )
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
    
    db.session.delete(photo)
    db.session.commit()
    
    return jsonify({'success': True}), 200
