"""A blank barcode must never destroy a stored one (FF-0081).

The failure this pins: the scanner stores a real code, then opening the edit form (whose
barcode field is blank) and saving anything sent `barcode_id: ''`. The log PUT accepted it
because it checked `is not None`, and `_sync_linked_food` then copied the blank onto the
Food row, so the scanned code was gone from both.
"""

import pytest

from app import db
from app.models.food import Food
from app.models.food_log import FoodLog
from app.models.user import User

SCANNED = '0016000140912'


@pytest.fixture
def user_and_log(client, app):
    client.post('/api/auth/register', json={
        'email': 'barcode@test.local', 'password': 'password123', 'name': 'Barcode',
    })
    client.post('/api/auth/logout')
    client.post('/api/auth/login', json={
        'email': 'barcode@test.local', 'password': 'password123',
    })
    with app.app_context():
        user = User.query.filter_by(email='barcode@test.local').first()
        food = Food(
            user_id=user.id, name='french toaster STICKS Cinnamon', brand='Eggo',
            calories=170, protein_g=3, carbs_g=33, fat_g=4,
            serving_size='2 sticks', barcode_id=SCANNED,
        )
        db.session.add(food)
        db.session.flush()
        log = FoodLog(
            user_id=user.id, food_id=food.id, food_name=food.name,
            calories=170, protein_g=3, carbs_g=33, fat_g=4,
            meal_type='breakfast', date=__import__('datetime').date.today(),
            barcode_id=SCANNED,
        )
        db.session.add(log)
        db.session.commit()
        return user.id, food.id, log.id


class TestBlankBarcodeIsNotAValue:
    def _log(self, client, app, log_id):
        with app.app_context():
            return db.session.get(FoodLog, log_id)

    def _food(self, client, app, food_id):
        with app.app_context():
            return db.session.get(Food, food_id)

    def test_saving_without_the_key_keeps_the_code(self, client, app, user_and_log):
        _, _, log_id = user_and_log

        client.put(f'/api/food/log/{log_id}', json={'calories': 180, 'food_name': 'toaster sticks'})

        assert self._log(client, app, log_id).barcode_id == SCANNED

    def test_saving_an_explicit_empty_string_keeps_the_code(self, client, app, user_and_log):
        """The edit form sends '' when the field is untouched — it must not matter."""
        _, food_id, log_id = user_and_log

        client.put(f'/api/food/log/{log_id}', json={
            'calories': 180, 'food_name': 'toaster sticks', 'barcode_id': '',
        })

        assert self._log(client, app, log_id).barcode_id == SCANNED
        # and the linked Food keeps its own copy
        assert self._food(client, app, food_id).barcode_id == SCANNED

    def test_whitespace_is_treated_as_blank(self, client, app, user_and_log):
        _, _, log_id = user_and_log

        client.put(f'/api/food/log/{log_id}', json={'barcode_id': '   '})

        assert self._log(client, app, log_id).barcode_id == SCANNED

    def test_a_real_code_replaces_the_old_one(self, client, app, user_and_log):
        _, _, log_id = user_and_log

        client.put(f'/api/food/log/{log_id}', json={'barcode_id': '0123456789012'})

        assert self._log(client, app, log_id).barcode_id == '0123456789012'

    def test_a_new_custom_food_stores_null_rather_than_blank(self, client, app, user_and_log):
        response = client.post('/api/food', json={
            'name': 'Hand typed food', 'calories': 100, 'barcode_id': '',
        })

        assert response.status_code in (200, 201)
        with app.app_context():
            food = Food.query.filter_by(name='Hand typed food').first()
            assert food.barcode_id is None

    def test_logging_again_does_not_wipe_the_cached_code(self, client, app, user_and_log):
        _, food_id, _ = user_and_log
        import datetime

        client.post('/api/food/log', json={
            'food_id': food_id,
            'food_name': 'french toaster STICKS Cinnamon',
            'calories': 170, 'meal_type': 'snack',
            'date': datetime.date.today().isoformat(),
            'barcode_id': '',
        })

        assert self._food(client, app, food_id).barcode_id == SCANNED
