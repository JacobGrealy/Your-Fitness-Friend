from datetime import datetime
from app import db


class WeightLog(db.Model):
    """Weight log model."""
    
    __tablename__ = 'weight_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    weight = db.Column(db.Float, nullable=False)  # in kg
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    photo_url = db.Column(db.String(256))
    
    def __repr__(self):
        return f'<WeightLog {self.weight}kg on {self.recorded_at}>'
