"""Optional per-session exercise photos (FF-0112)."""
from alembic import op
import sqlalchemy as sa

revision = 'c11200000001'
down_revision = 'c10600000001'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('exercise_logs') as batch:
        batch.add_column(sa.Column('photo_url', sa.String(256), nullable=True))


def downgrade():
    with op.batch_alter_table('exercise_logs') as batch:
        batch.drop_column('photo_url')
