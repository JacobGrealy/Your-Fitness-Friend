from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

import sqlalchemy as sa

from app import db


class User(UserMixin, db.Model):
    """User model for authentication."""
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Profile information
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    height = db.Column(db.Float)  # in cm
    weight = db.Column(db.Float)  # current weight in kg
    activity_level = db.Column(db.String(20))  # sedentary, light, moderate, active, very active
    daily_calorie_goal = db.Column(db.Integer, default=2000)
    # True once the user sets the goal themselves: recalculation must then leave
    # it alone, or "set my own goal" would be undone by the next profile edit.
    calorie_goal_manual = db.Column(db.Boolean, nullable=False, default=False,
                                    server_default=sa.false())
    weight_goal_lbs = db.Column(db.Float, nullable=True)
    weekly_goal = db.Column(db.String(20), nullable=True, default='maintain')  # maintain, lose_0_5, lose_1, lose_1_5, lose_2
    profile_photo_path = db.Column(db.String(256), nullable=True)
    
    # Relationships
    weight_logs = db.relationship('WeightLog', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    exercise_logs = db.relationship('ExerciseLog', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    saved_exercises = db.relationship('SavedExercise', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    food_logs = db.relationship('FoodLog', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    meal_photos = db.relationship('MealPhoto', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password against hash."""
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'
