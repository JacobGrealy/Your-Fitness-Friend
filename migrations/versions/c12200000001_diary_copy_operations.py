"""Retry-safe explicit diary copy operations (FF-0122)."""
from alembic import op
import sqlalchemy as sa

revision = 'c12200000001'
down_revision = 'c11800000001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('diary_copy_operations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False),
        sa.Column('payload_hash', sa.String(64), nullable=False),
        sa.Column('result', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id', 'request_id', name='uq_diary_copy_request'),
    )


def downgrade():
    op.drop_table('diary_copy_operations')
