"""add calorie_goal_manual to users

Revision ID: d6dc0a74684b
Revises: a1b2c3d4e5f6
Create Date: 2026-10-17 17:35:48.087216

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd6dc0a74684b'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    """Track whether the user set their calorie goal by hand.

    Without this flag a manual goal is silently overwritten the next time any
    profile field changes, because the PUT recalculates from BMR/TDEE. False is
    the right default for existing rows: they were all derived.
    """
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('calorie_goal_manual', sa.Boolean(), nullable=False,
                      server_default=sa.false())
        )


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('calorie_goal_manual')
