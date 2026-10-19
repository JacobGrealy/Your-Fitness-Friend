from datetime import datetime
from app import db


class Food(db.Model):
    """Custom food entries for user's food database."""
    
    __tablename__ = 'foods'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    name = db.Column(db.String(120), nullable=False, index=True)
    calories = db.Column(db.Integer, nullable=False)
    protein_g = db.Column(db.Float, default=0.0)
    carbs_g = db.Column(db.Float, default=0.0)
    fat_g = db.Column(db.Float, default=0.0)
    serving_size = db.Column(db.String(255), nullable=True)
    serving_amount = db.Column(db.Float, nullable=True)
    serving_unit = db.Column(db.String(20), nullable=True)
    brand = db.Column(db.String(100), nullable=True)
    barcode_id = db.Column(db.String(100), nullable=True)
    external_id = db.Column(db.String(100), nullable=True)
    __table_args__ = (db.UniqueConstraint('user_id', 'external_id', name='uq_food_user_external'),)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'calories': self.calories,
            'protein_g': self.protein_g,
            'carbs_g': self.carbs_g,
            'fat_g': self.fat_g,
            'serving_size': self.serving_size,
            'serving_amount': self.serving_amount,
            'serving_unit': self.serving_unit,
            'brand': self.brand,
            'barcode_id': self.barcode_id,
            'external_id': self.external_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Food {self.name}>'
