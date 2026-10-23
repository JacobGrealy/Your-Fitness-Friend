"""Water intake in fluid ounces (FF-0127)."""
from alembic import op
import sqlalchemy as sa

revision = 'c12700000001'
down_revision = 'c12200000001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('hydration_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('amount_oz', sa.Float(), nullable=False),
        sa.Column('logged_at', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=False),
        sa.CheckConstraint('amount_oz > 0 AND amount_oz <= 1000', name='ck_hydration_amount'),
    )
    op.create_index('ix_hydration_user_time', 'hydration_logs', ['user_id', 'logged_at'])


def downgrade():
    op.drop_index('ix_hydration_user_time', table_name='hydration_logs')
    op.drop_table('hydration_logs')
