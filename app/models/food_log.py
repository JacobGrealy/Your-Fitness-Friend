from datetime import datetime
from app import db


class FoodLog(db.Model):
    """Food log entries for daily tracking."""
    
    __tablename__ = 'food_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    food_id = db.Column(db.Integer, db.ForeignKey('foods.id'), nullable=True, index=True)
    food_name = db.Column(db.String(120), nullable=False)
    calories = db.Column(db.Integer, nullable=False)
    protein_g = db.Column(db.Float, default=0.0)
    carbs_g = db.Column(db.Float, default=0.0)
    fat_g = db.Column(db.Float, default=0.0)
    serving_size = db.Column(db.String(255), nullable=True)
    number_of_servings = db.Column(db.Float, nullable=True)

    # Per-serving nutrition, so `calories`/`protein_g`/... above are unambiguously TOTALS
    # and `total = per_serving * number_of_servings` holds for every row (FF-0083).
    calories_per_serving = db.Column(db.Float, nullable=True)
    protein_per_serving = db.Column(db.Float, nullable=True)
    carbs_per_serving = db.Column(db.Float, nullable=True)
    fat_per_serving = db.Column(db.Float, nullable=True)
    photo_url = db.Column(db.String(512), nullable=True)
    brand = db.Column(db.String(100), nullable=True)
    barcode_id = db.Column(db.String(100), nullable=True)
    date = db.Column(db.Date, nullable=False, index=True)
    meal_type = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to Food (optional - only set when user logs from their food database)
    food = db.relationship('Food', backref='food_logs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'food_id': self.food_id,
            'food_name': self.food_name,
            'calories': self.calories,
            'protein_g': self.protein_g,
            'carbs_g': self.carbs_g,
            'fat_g': self.fat_g,
            'serving_size': self.serving_size,
            'number_of_servings': self.number_of_servings,
            'calories_per_serving': self.calories_per_serving,
            'protein_per_serving': self.protein_per_serving,
            'carbs_per_serving': self.carbs_per_serving,
            'fat_per_serving': self.fat_per_serving,
            'photo_url': self.photo_url,
            'brand': self.brand,
            'barcode_id': self.barcode_id,
            'date': self.date.isoformat() if self.date else None,
            'meal_type': self.meal_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def per_serving(self):
        """Per-serving values, falling back to totals for rows with a count of one."""
        from app.utils.serving import MACROS, normalise_servings, per_serving_from_totals

        stored = {
            'calories': self.calories_per_serving,
            'protein_g': self.protein_per_serving,
            'carbs_g': self.carbs_per_serving,
            'fat_g': self.fat_per_serving,
        }
        if all(value is not None for value in stored.values()):
            return stored

        derived = per_serving_from_totals(
            {macro: getattr(self, macro) for macro in MACROS},
            normalise_servings(self.number_of_servings),
        )
        return {macro: stored[macro] if stored[macro] is not None else derived[macro]
                for macro in MACROS}

    def __repr__(self):
        return f'<FoodLog {self.food_name} on {self.date}>'
