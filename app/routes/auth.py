from functools import wraps

from flask import Blueprint, request, jsonify, session, redirect, url_for, send_file, current_app
import uuid
import os
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models.user import User
from app.utils.bmr_calculator import calculate_bmr_and_macros
from app.config import Config
from werkzeug.security import generate_password_hash, check_password_hash

bp = Blueprint('auth', __name__)


def require_auth(f):
    """Decorator to require authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function


@bp.route('/register', methods=['GET', 'POST'])
def register():
    """Handle user registration."""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))
    
    if request.method == 'POST':
        data = request.get_json() or request.form
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        
        # Validation
        if not email or not password:
            return jsonify({'error': 'All fields are required'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Check if user exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        # Calculate BMR and daily calorie goal if profile info provided
        daily_calorie_goal = 2000
        if all([data.get('age'), data.get('gender'), data.get('height'), data.get('weight'), data.get('activity_level')]):
            profile = {
                'age': data['age'],
                'gender': data['gender'],
                'height': data['height'],
                'weight': data['weight'],
                'activity_level': data['activity_level']
            }
            nutritional_profile = calculate_bmr_and_macros(profile)
            daily_calorie_goal = int(nutritional_profile['tdee'])
        
        # Create user
        user = User(
            username=email,
            email=email,
            age=data.get('age'),
            gender=data.get('gender'),
            height=data.get('height'),
            weight=data.get('weight'),
            activity_level=data.get('activity_level'),
            daily_calorie_goal=daily_calorie_goal
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        
        return jsonify({
            'message': 'Registration successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'daily_calorie_goal': user.daily_calorie_goal
            }
        }), 201
    
    return jsonify({'message': 'Registration form'})


@bp.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login."""
    if current_user.is_authenticated:
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email
            }
        })
    
    if request.method == 'POST':
        data = request.get_json() or request.form
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        remember = data.get('remember', False)
        
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user, remember=remember)
            next_page = request.form.get('next')
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            })
        
        return jsonify({'error': 'Invalid email or password'}), 401
    
    return jsonify({'message': 'Login form'})


@bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Handle user logout."""
    logout_user()
    return jsonify({'message': 'Logged out successfully'})


@bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current user profile."""
    user = {
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'age': current_user.age,
        'gender': current_user.gender,
        'height': current_user.height,
        'weight': current_user.weight,
        'activity_level': current_user.activity_level,
        'created_at': current_user.created_at.isoformat()
    }
    return jsonify(user)


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
            'weight_goal_lbs': current_user.weight_goal_lbs
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
        if 'weight_goal_lbs' in data:
            current_user.weight_goal_lbs = data['weight_goal_lbs']
        
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
                'weight_goal_lbs': current_user.weight_goal_lbs
            }
        })


@bp.route('/profile-photo', methods=['POST'])
@login_required
def upload_profile_photo():
    """Upload a profile photo for the current user."""
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo provided'}), 400

    file = request.files['photo']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if '.' not in file.filename:
        return jsonify({'error': 'Invalid file type. Only JPG, PNG, and WebP are allowed.'}), 400

    extension = file.filename.rsplit('.', 1)[1].lower()
    allowed = Config.ALLOWED_EXTENSIONS.get('profile_photos', set())
    if extension not in allowed:
        return jsonify({'error': 'Invalid file type. Only JPG, PNG, and WebP are allowed.'}), 400

    if file.content_length and file.content_length > 10 * 1024 * 1024:
        return jsonify({'error': 'File too large. Maximum size is 10MB.'}), 400

    if current_user.profile_photo_path:
        old_path = os.path.join(
            current_app.root_path,
            'uploads',
            current_user.profile_photo_path
        )
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    unique_filename = f"{uuid.uuid4().hex}.{extension}"

    upload_folder = os.path.join(
        current_app.root_path,
        'uploads',
        'profile_photos'
    )
    os.makedirs(upload_folder, exist_ok=True)
    filepath = os.path.join(upload_folder, unique_filename)
    file.save(filepath)

    current_user.profile_photo_path = unique_filename
    db.session.commit()

    return jsonify({
        'profile_photo_url': unique_filename
    }), 200
