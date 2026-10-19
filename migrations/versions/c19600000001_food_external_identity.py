"""Optional provider identity for race-safe per-user OFF imports (FF-0096)."""
from alembic import op
import sqlalchemy as sa

revision = 'c19600000001'
down_revision = 'c19400000001'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('foods') as batch:
        batch.add_column(sa.Column('external_id', sa.String(100), nullable=True))
        batch.create_unique_constraint('uq_food_user_external', ['user_id', 'external_id'])


def downgrade():
    with op.batch_alter_table('foods') as batch:
        batch.drop_constraint('uq_food_user_external', type_='unique')
        batch.drop_column('external_id')
