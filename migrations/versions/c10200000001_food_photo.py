"""The food owns its picture; logs inherit it (FF-0102).

Adds `foods.photo_url` and backfills each saved food with the newest photo from its own
logs, so existing thumbnails keep working. No log photo is rewritten or removed here — the
backfill only copies a reference upward, which is why no existing entry changes.
"""
from alembic import op
import sqlalchemy as sa

revision = 'c10200000001'
down_revision = 'c19600000001'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('foods') as batch:
        batch.add_column(sa.Column('photo_url', sa.String(512), nullable=True))

    # The most recently logged photo for each food becomes the food's picture. Ties break
    # on id, matching how every other "newest log" query in the app behaves.
    op.execute(
        """
        UPDATE foods SET photo_url = (
            SELECT fl.photo_url FROM food_logs fl
            WHERE fl.food_id = foods.id AND fl.photo_url IS NOT NULL
            ORDER BY fl.date DESC, fl.id DESC
            LIMIT 1
        )
        WHERE photo_url IS NULL
        """
    )


def downgrade():
    with op.batch_alter_table('foods') as batch:
        batch.drop_column('photo_url')
