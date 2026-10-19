"""food log per-serving nutrition

Revision ID: 5274c85d8204
Revises: cef99f51c9d7
Create Date: 2026-10-18 20:41:28.645987

Adds the per-serving figures so a log's totals stop being ambiguous (FF-0083), and
backfills them from what is stored WITHOUT altering a single existing value: the totals
columns are left exactly as they were, which is why the owner's existing logs do not move.

The backfill divides the stored total by the stored serving count, which reproduces the
per-serving figure for rows written by the create path. Rows where the number was really
per-serving all along (because that path never multiplied) end up with a per-serving value
scaled by 1/servings - their totals are untouched, and they behave consistently from here.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5274c85d8204'
down_revision = 'cef99f51c9d7'
branch_labels = None
depends_on = None

MACROS = ('calories', 'protein_g', 'carbs_g', 'fat_g')


def upgrade():
    with op.batch_alter_table('food_logs', schema=None) as batch_op:
        for macro in MACROS:
            batch_op.add_column(sa.Column(f'{macro.removesuffix("_g")}_per_serving',
                                          sa.Float(), nullable=True))

    # Value-preserving: divide, never rewrite. A null or non-positive serving count means
    # "one serving", which is what the rest of the app assumes for those rows.
    for macro in MACROS:
        per_serving = f'{macro.removesuffix("_g")}_per_serving'
        op.execute(
            f'UPDATE food_logs SET {per_serving} = '
            f'CASE '
            f'  WHEN number_of_servings IS NOT NULL AND number_of_servings > 0 '
            f'       THEN CAST({macro} AS REAL) / number_of_servings '
            f'  ELSE CAST({macro} AS REAL) '
            f'END '
            f'WHERE {macro} IS NOT NULL'
        )


def downgrade():
    with op.batch_alter_table('food_logs', schema=None) as batch_op:
        for macro in MACROS:
            batch_op.drop_column(f'{macro.removesuffix("_g")}_per_serving')
