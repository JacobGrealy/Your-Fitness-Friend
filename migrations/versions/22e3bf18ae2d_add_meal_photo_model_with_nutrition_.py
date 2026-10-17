"""Add meal_photo model with nutrition fields

Revision ID: 22e3bf18ae2d
Revises: 8d631de69406
Create Date: 2026-04-02 00:26:18.244558

NOTE (FF-0013): the initial migration 851f1e051e23 already creates
`meal_photos`, so this one has always failed on a *fresh* database with
"table meal_photos already exists". The live database never noticed because it
was past this revision already, which is exactly why a fresh `upgrade head`
needed a test (tests/test_migrations.py).

The revision is kept, not deleted — removing it would break the ancestry of the
live database's alembic_version — and both halves are now guarded so they are
no-ops when the table is already there.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '22e3bf18ae2d'
down_revision = '8d631de69406'
branch_labels = None
depends_on = None


def upgrade():
    # Idempotent: see the note above. A fresh install reaches this revision with
    # the table already created by 851f1e051e23.
    if sa.inspect(op.get_bind()).has_table('meal_photos'):
        return

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
    if not sa.inspect(op.get_bind()).has_table('meal_photos'):
        return
    op.drop_index(op.f('ix_meal_photos_user_id'), table_name='meal_photos')
    op.drop_table('meal_photos')
