"""Personal medication intake and bowel movement diary entries."""
from app import db


class HealthLog(db.Model):
    __tablename__ = 'health_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    kind = db.Column(db.String(20), nullable=False)
    logged_at = db.Column(db.DateTime, nullable=False, index=True)  # user's wall-clock time
    dose_mg = db.Column(db.Float)
    notes = db.Column(db.Text)
    __table_args__ = (
        db.CheckConstraint("kind IN ('medication', 'bowel')", name='ck_health_log_kind'),
        db.CheckConstraint("(kind = 'medication' AND dose_mg IS NOT NULL AND dose_mg IN (1.5, 4, 9, 25)) OR (kind = 'bowel' AND dose_mg IS NULL)", name='ck_health_log_dose'),
    )
