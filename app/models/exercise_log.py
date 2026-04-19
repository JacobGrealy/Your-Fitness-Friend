from datetime import datetime
from app import db


class ExerciseLog(db.Model):
    """Exercise log model."""
    
    __tablename__ = 'exercise_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    saved_exercise_id = db.Column(db.Integer, db.ForeignKey('saved_exercises.id'))
    exercise_name = db.Column(db.String(100), nullable=False)
    duration = db.Column(db.Float)  # in minutes
    calories_burned = db.Column(db.Float)
    intensity = db.Column(db.String(20))  # low, medium, high
    notes = db.Column(db.Text)
    logged_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ExerciseLog {self.exercise_name} on {self.logged_at}>'
