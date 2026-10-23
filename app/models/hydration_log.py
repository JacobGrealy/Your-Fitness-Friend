from app import db


class HydrationLog(db.Model):
    __tablename__ = 'hydration_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount_oz = db.Column(db.Float, nullable=False)
    logged_at = db.Column(db.DateTime, nullable=False)
    notes = db.Column(db.Text, nullable=False, default='')
    __table_args__ = (
        db.CheckConstraint('amount_oz > 0 AND amount_oz <= 1000', name='ck_hydration_amount'),
        db.Index('ix_hydration_user_time', 'user_id', 'logged_at'),
    )
