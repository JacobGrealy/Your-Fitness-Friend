"""Typed exercise inputs and calculation snapshots (FF-0106).

Existing logs remain unclassified; missing historical inputs are not invented.
"""
from alembic import op
import sqlalchemy as sa

revision = 'c10600000001'
down_revision = 'c10200000001'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('exercise_logs') as batch:
        batch.add_column(sa.Column('activity_id', sa.String(50), nullable=True))
        batch.add_column(sa.Column('tracking_format', sa.String(30), nullable=True))
        batch.add_column(sa.Column('details', sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table('exercise_logs') as batch:
        batch.drop_column('details')
        batch.drop_column('tracking_format')
        batch.drop_column('activity_id')
