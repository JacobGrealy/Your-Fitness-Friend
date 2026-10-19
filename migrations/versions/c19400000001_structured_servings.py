"""Structured servings, conservative metadata-only backfill (FF-0094).

Nutrition, serving counts and original labels are never rewritten.
"""
from alembic import op
import sqlalchemy as sa
import re

revision = 'c19400000001'
down_revision = '5274c85d8204'
branch_labels = None
depends_on = None

# Frozen migration vocabulary; do not import evolving application code.
UNITS = {'g', 'kg', 'oz', 'lb', 'ml', 'cup', 'tbsp', 'tsp', 'serving', 'item'}
ALIASES = {'gram': 'g', 'grams': 'g', 'ounce': 'oz', 'ounces': 'oz',
           'cups': 'cup', 'tablespoons': 'tbsp', 'teaspoons': 'tsp',
           'servings': 'serving', 'items': 'item', 'lbs': 'lb'}


def upgrade():
    for table in ('foods', 'food_logs'):
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column('serving_amount', sa.Float(), nullable=True))
            batch.add_column(sa.Column('serving_unit', sa.String(20), nullable=True))
            if table == 'food_logs':
                batch.add_column(sa.Column('amount', sa.Float(), nullable=True))
                batch.add_column(sa.Column('unit', sa.String(20), nullable=True))
        conn = op.get_bind()
        columns = 'id, serving_size' + (', number_of_servings' if table == 'food_logs' else '')
        for row in conn.execute(sa.text(f'SELECT {columns} FROM {table}')).mappings():
            match = re.fullmatch(r'\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*', row['serving_size'] or '')
            amount, unit = None, None
            if match:
                candidate = ALIASES.get(match[2].lower(), match[2].lower())
                if candidate in UNITS and float(match[1]) > 0:
                    amount, unit = float(match[1]), candidate
            params = {'id': row['id'], 'a': amount, 'u': unit}
            sets = 'serving_amount=:a, serving_unit=:u'
            if table == 'food_logs':
                count = row['number_of_servings'] or 1
                count = count if count > 0 else 1
                params.update(eaten=count * (amount or 1), eaten_unit=unit or 'serving')
                sets += ', amount=:eaten, unit=:eaten_unit'
            conn.execute(sa.text(f'UPDATE {table} SET {sets} WHERE id=:id'), params)


def downgrade():
    for table in ('food_logs', 'foods'):
        with op.batch_alter_table(table) as batch:
            if table == 'food_logs':
                batch.drop_column('unit')
                batch.drop_column('amount')
            batch.drop_column('serving_unit')
            batch.drop_column('serving_amount')
