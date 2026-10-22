"""Medication intake and bowel movement logs (FF-0118)."""
from alembic import op
import sqlalchemy as sa

revision = 'c11800000001'
down_revision = 'c11200000001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('health_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('kind', sa.String(20), nullable=False),
        sa.Column('logged_at', sa.DateTime(), nullable=False),
        sa.Column('dose_mg', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.CheckConstraint("kind IN ('medication', 'bowel')", name='ck_health_log_kind'),
        sa.CheckConstraint("(kind = 'medication' AND dose_mg IS NOT NULL AND dose_mg IN (1.5, 4, 9, 25)) OR (kind = 'bowel' AND dose_mg IS NULL)", name='ck_health_log_dose'),
    )
    op.create_index('ix_health_logs_user_id', 'health_logs', ['user_id'])
    op.create_index('ix_health_logs_logged_at', 'health_logs', ['logged_at'])


def downgrade():
    op.drop_table('health_logs')
