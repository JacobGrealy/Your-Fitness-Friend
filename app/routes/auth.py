from functools import wraps

from flask import Blueprint, request, jsonify, session, redirect, url_for
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models.user import User
from app.utils.bmr_calculator import calculate_bmr_and_macros
from werkzeug.security import generate_password_hash, check_password_hash

bp = Blueprint('auth', __name__, url_prefix='/auth')


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
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        # Validation
        if not username or not email or not password:
            return jsonify({'error': 'All fields are required'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Check if user exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken'}), 400
        
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
            username=username,
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
        return redirect(url_for('dashboard.index'))
    
    if request.method == 'POST':
        data = request.get_json() or request.form
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        remember = data.get('remember', False)
        
        user = User.query.filter_by(username=username).first()
        
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
        
        return jsonify({'error': 'Invalid username or password'}), 401
    
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
            'activity_level': current_user.activity_level
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
                'activity_level': current_user.activity_level
            }
        })
