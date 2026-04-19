from datetime import datetime, date
from app import db


class MealPhoto(db.Model):
    """Meal photo model for tracking food photos."""
    
    __tablename__ = 'meal_photos'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    photo_path = db.Column(db.String(256), nullable=False)
    estimated_calories = db.Column(db.Integer)
    estimated_protein = db.Column(db.Float)
    estimated_carbs = db.Column(db.Float)
    estimated_fat = db.Column(db.Float)
    date = db.Column(db.Date, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<MealPhoto {self.photo_path} on {self.date}>'
