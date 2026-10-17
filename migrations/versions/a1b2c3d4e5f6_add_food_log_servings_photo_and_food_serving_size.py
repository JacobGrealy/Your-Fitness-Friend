"""add food_log number_of_servings serving_size photo_url and food serving_size

Revision ID: a1b2c3d4e5f6
Revises: dead8544412f
Create Date: 2026-06-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'dead8544412f'
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Add new columns to food_logs
    with op.batch_alter_table('food_logs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('number_of_servings', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('_temp_serving_size', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('photo_url', sa.String(length=512), nullable=True))

    # Step 2: Copy old serving_size string values to number_of_servings as float
    op.execute("""
        UPDATE food_logs
        SET number_of_servings = CAST(serving_size AS REAL)
        WHERE serving_size IS NOT NULL AND serving_size != ''
    """)
    # Default to 1.0 for null/empty values
    op.execute("""
        UPDATE food_logs
        SET number_of_servings = 1.0
        WHERE number_of_servings IS NULL
    """)

    # Step 3: Drop old serving_size and rename temp column
    with op.batch_alter_table('food_logs', schema=None) as batch_op:
        batch_op.drop_column('serving_size')
        batch_op.alter_column('_temp_serving_size', new_column_name='serving_size')

    # Step 4: Add serving_size to foods table
    with op.batch_alter_table('foods', schema=None) as batch_op:
        batch_op.add_column(sa.Column('serving_size', sa.String(length=255), nullable=True))


def downgrade():
    # Step 1: Remove serving_size from foods
    with op.batch_alter_table('foods', schema=None) as batch_op:
        batch_op.drop_column('serving_size')

    # Step 2: Restore old serving_size from number_of_servings
    with op.batch_alter_table('food_logs', schema=None) as batch_op:
        batch_op.alter_column('serving_size', new_column_name='_temp_serving_size')
        batch_op.add_column(sa.Column('serving_size', sa.String(length=100), nullable=True))

    # Convert number_of_servings back to string format
    op.execute("""
        UPDATE food_logs
        SET serving_size = CAST(number_of_servings AS TEXT)
        WHERE number_of_servings IS NOT NULL
    """)

    with op.batch_alter_table('food_logs', schema=None) as batch_op:
        batch_op.drop_column('photo_url')
        batch_op.drop_column('number_of_servings')
        batch_op.drop_column('_temp_serving_size')
