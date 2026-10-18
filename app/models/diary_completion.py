from datetime import datetime

from app import db


class DiaryCompletion(db.Model):
    """A day the user declared finished logging (FF-0054).

    One row per user per day: MyFitnessPal lets you keep logging after
    completing and complete again, so re-completing updates this row instead of
    adding another. The stored totals are the snapshot shown on the completion
    screen, kept so the projection does not silently change later.
    """

    __tablename__ = 'diary_completions'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'date', name='uq_diary_completion_user_date'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    calories = db.Column(db.Integer, default=0)
    protein_g = db.Column(db.Float, default=0)
    carbs_g = db.Column(db.Float, default=0)
    fat_g = db.Column(db.Float, default=0)

    #: Projected five-week change in pounds; null when no projection was shown.
    change_lbs = db.Column(db.Float, nullable=True)

    def __repr__(self):
        return f'<DiaryCompletion user={self.user_id} {self.date}>'
