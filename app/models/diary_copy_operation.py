"""Persistent retry protection for explicit diary copy actions."""
from datetime import datetime
from app import db


class DiaryCopyOperation(db.Model):
    __tablename__ = 'diary_copy_operations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    request_id = db.Column(db.String(36), nullable=False)
    payload_hash = db.Column(db.String(64), nullable=False)
    result = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('user_id', 'request_id', name='uq_diary_copy_request'),)
