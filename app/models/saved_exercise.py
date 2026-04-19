from app import db


class SavedExercise(db.Model):
    """Saved exercise model for user's exercise library."""
    
    __tablename__ = 'saved_exercises'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    muscle_group = db.Column(db.String(50))  # chest, back, legs, shoulders, arms, core, cardio
    type = db.Column(db.String(50))  # strength, cardio, flexibility, hiit
    description = db.Column(db.Text)
    instructions = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    # Relationships
    exercise_logs = db.relationship('ExerciseLog', backref='saved_exercise', lazy='dynamic')
    
    def __repr__(self):
        return f'<SavedExercise {self.name}>'
