"""Add meal_photo model with nutrition fields

Revision ID: 22e3bf18ae2d
Revises: 8d631de69406
Create Date: 2026-04-02 00:26:18.244558

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '22e3bf18ae2d'
down_revision = '8d631de69406'
branch_labels = None
depends_on = None


def upgrade():
    # Create meal_photos table with nutrition fields
    op.create_table(
        'meal_photos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('photo_path', sa.String(length=256), nullable=False),
        sa.Column('estimated_calories', sa.Integer(), nullable=True),
        sa.Column('estimated_protein', sa.Float(), nullable=True),
        sa.Column('estimated_carbs', sa.Float(), nullable=True),
        sa.Column('estimated_fat', sa.Float(), nullable=True),
        sa.Column('date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_meal_photos_user_id'), 'meal_photos', ['user_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_meal_photos_user_id'), table_name='meal_photos')
    op.drop_table('meal_photos')
