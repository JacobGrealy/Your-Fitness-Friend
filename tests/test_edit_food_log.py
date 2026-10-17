"""Tests for the Edit Food Log backend: single-log fetch, update, photos, recent.

Covers the API surface the EditFoodLog page depends on, plus the linked-Food
sync rule: editing a log updates its Food record but must not rewrite other logs
that reference the same food.
"""

import io
import os
from datetime import date, timedelta

import pytest

from app import db
from app.models.food import Food
from app.models.food_log import FoodLog
from app.models.user import User


def make_log(client, **overrides):
    """Create a food log through the API and return the created payload."""
    payload = {
        'food_name': 'Oatmeal',
        'calories': 300,
        'protein_g': 10,
        'carbs_g': 40,
        'fat_g': 8,
        'date': '2026-06-10',
        'meal_type': 'breakfast',
        'number_of_servings': 1.5,
        'serving_size': '1 cup',
    }
    payload.update(overrides)
    response = client.post('/api/food/log', json=payload)
    assert response.status_code == 201, response.get_json()
    return response.get_json()


@pytest.fixture
def authed(client, test_user):
    """Log the conftest test_user in and return the client.

    conftest's ``authenticated_client`` posts ``username``, but POST
    /api/auth/login authenticates by email, so that fixture logs nobody in -
    which is why several route tests are parked as "Requires session handling
    fix". Logging in by email here keeps these tests independent of that bug.
    """
    response = client.post(
        '/api/auth/login',
        json={'email': test_user.email, 'password': 'testpass123'},
    )
    assert response.status_code == 200, response.get_json()
    return client

@pytest.fixture
def uploads(app, tmp_path):
    """Point uploads at a temporary directory so tests never touch app/uploads."""
    directory = tmp_path / 'uploads'
    app.config['UPLOAD_FOLDER'] = str(directory)
    return directory


@pytest.fixture
def other_user(app):
    """A second user, created directly in the DB.

    Authorization tests build a log owned by this user and then act as the
    conftest user. Doing it in the DB avoids needing a second logged-in test
    client: a client created inside this suite's preserved request context
    inherits the first client's session cookie, and POST /api/auth/login
    short-circuits when a session is already authenticated.
    """
    with app.app_context():
        user = User(
            username='otheruser',
            email='otheruser@test.com',
            age=30,
            gender='female',
            height=160,
            weight=60,
        )
        user.set_password('otherpass123')
        db.session.add(user)
        db.session.commit()
        return user.id


def make_foreign_log(app, user_id, **overrides):
    """Insert a food log owned by another user, bypassing the API."""
    fields = {
        'user_id': user_id,
        'food_name': 'Someone Elses Meal',
        'calories': 500,
        'protein_g': 20,
        'carbs_g': 50,
        'fat_g': 10,
        'date': date(2026, 6, 10),
        'meal_type': 'dinner',
    }
    fields.update(overrides)
    with app.app_context():
        log = FoodLog(**fields)
        db.session.add(log)
        db.session.commit()
        return log.id


class TestGetFoodLog:
    def test_returns_the_log_with_editable_fields(self, authed):
        created = make_log(authed)

        response = authed.get(f"/api/food/log/{created['id']}")

        assert response.status_code == 200
        body = response.get_json()
        assert body['id'] == created['id']
        assert body['food_name'] == 'Oatmeal'
        assert body['calories'] == 300
        assert body['number_of_servings'] == 1.5
        assert body['serving_size'] == '1 cup'
        assert body['date'] == '2026-06-10'
        assert body['meal_type'] == 'breakfast'
        assert body['photo_url'] is None

    def test_unknown_id_returns_404(self, authed):
        response = authed.get('/api/food/log/999999')

        assert response.status_code == 404

    def test_other_users_log_returns_404(self, authed, app, other_user):
        # A log owned by another user must be invisible, not forbidden:
        # returning 404 avoids revealing that the id exists.
        log_id = make_foreign_log(app, other_user)

        response = authed.get(f"/api/food/log/{log_id}")

        assert response.status_code == 404


class TestUpdateFoodLog:
    def test_updates_date_and_servings(self, authed):
        created = make_log(authed)

        response = authed.put(
            f"/api/food/log/{created['id']}",
            json={
                'date': '2026-06-11',
                'number_of_servings': 2.0,
                'serving_size': '2 cups',
                'calories': 420,
            },
        )

        assert response.status_code == 200
        body = response.get_json()
        assert body['date'] == '2026-06-11'
        assert body['number_of_servings'] == 2.0
        assert body['serving_size'] == '2 cups'
        assert body['calories'] == 420

    def test_updates_barcode_and_meal_type(self, authed):
        created = make_log(authed)

        response = authed.put(
            f"/api/food/log/{created['id']}",
            json={'barcode_id': '012345678901', 'meal_type': 'lunch'},
        )

        assert response.status_code == 200
        body = response.get_json()
        assert body['barcode_id'] == '012345678901'
        assert body['meal_type'] == 'lunch'

    def test_rejects_invalid_meal_type(self, authed):
        created = make_log(authed)

        response = authed.put(
            f"/api/food/log/{created['id']}", json={'meal_type': 'brunch'}
        )

        assert response.status_code == 400

    def test_rejects_invalid_date(self, authed):
        created = make_log(authed)

        response = authed.put(
            f"/api/food/log/{created['id']}", json={'date': '11/06/2026'}
        )

        assert response.status_code == 400

    def test_rejects_non_positive_calories(self, authed):
        created = make_log(authed)

        response = authed.put(
            f"/api/food/log/{created['id']}", json={'calories': 0}
        )

        assert response.status_code == 400

    def test_rejects_non_positive_servings(self, authed):
        created = make_log(authed)

        response = authed.put(
            f"/api/food/log/{created['id']}", json={'number_of_servings': 0}
        )

        assert response.status_code == 400

    def test_unknown_id_returns_404(self, authed):
        response = authed.put(
            '/api/food/log/999999', json={'calories': 100}
        )

        assert response.status_code == 404

    def test_other_users_log_returns_404(self, authed, app, other_user):
        log_id = make_foreign_log(app, other_user)

        response = authed.put(f"/api/food/log/{log_id}", json={'calories': 100})

        assert response.status_code == 404


class TestLinkedFoodSync:
    def test_updates_linked_food_but_leaves_other_logs_alone(
        self, authed, app, test_user
    ):
        with app.app_context():
            food = Food(
                user_id=test_user.id,
                name='Oats',
                calories=150,
                protein_g=5,
                carbs_g=27,
                fat_g=3,
                serving_size='1 cup',
            )
            db.session.add(food)
            db.session.commit()
            food_id = food.id

        first = make_log(
            authed,
            food_id=food_id,
            food_name='Oats',
            calories=150,
            protein_g=5,
            date='2026-06-10',
        )
        second = make_log(
            authed,
            food_id=food_id,
            food_name='Oats',
            calories=150,
            protein_g=5,
            date='2026-06-11',
        )

        response = authed.put(
            f"/api/food/log/{first['id']}",
            json={'calories': 250, 'protein_g': 12, 'serving_size': '2 cups'},
        )
        assert response.status_code == 200

        with app.app_context():
            refreshed = db.session.get(Food, food_id)
            # The linked food record follows the edit...
            assert refreshed.calories == 250
            assert refreshed.protein_g == 12
            assert refreshed.serving_size == '2 cups'

            # ...but the other log keeps its own nutrition snapshot.
            untouched = db.session.get(FoodLog, second['id'])
            assert untouched.calories == 150
            assert untouched.protein_g == 5

    def test_log_without_food_id_updates_cleanly(self, authed):
        created = make_log(authed, food_id=None)

        response = authed.put(
            f"/api/food/log/{created['id']}", json={'calories': 200}
        )

        assert response.status_code == 200
        assert response.get_json()['calories'] == 200


class TestCreateFoodLogPersistsServings:
    def test_number_of_servings_is_stored(self, authed):
        created = make_log(authed, number_of_servings=2.5)

        assert created['number_of_servings'] == 2.5

        fetched = authed.get(f"/api/food/log/{created['id']}").get_json()
        assert fetched['number_of_servings'] == 2.5

    def test_rejects_non_positive_servings(self, authed):
        response = authed.post(
            '/api/food/log',
            json={
                'food_name': 'Toast',
                'calories': 120,
                'date': '2026-06-10',
                'meal_type': 'breakfast',
                'number_of_servings': -1,
            },
        )

        assert response.status_code == 400


class TestFoodLogPhoto:
    def test_upload_sets_photo_url(self, authed, uploads):
        created = make_log(authed)

        response = authed.post(
            f"/api/food/log/{created['id']}/photo",
            data={'photo': (io.BytesIO(b'fake-jpeg-bytes'), 'lunch.jpg')},
            content_type='multipart/form-data',
        )

        assert response.status_code == 200
        photo_url = response.get_json()['photo_url']
        assert photo_url.startswith('food_log_photos/')
        assert os.path.isfile(os.path.join(str(uploads), photo_url))

        fetched = authed.get(f"/api/food/log/{created['id']}").get_json()
        assert fetched['photo_url'] == photo_url

    def test_upload_rejects_disallowed_extension(self, authed, uploads):
        created = make_log(authed)

        response = authed.post(
            f"/api/food/log/{created['id']}/photo",
            data={'photo': (io.BytesIO(b'nope'), 'payload.exe')},
            content_type='multipart/form-data',
        )

        assert response.status_code == 400
        assert not uploads.exists() or not any(uploads.iterdir())

    def test_upload_without_a_file_returns_400(self, authed, uploads):
        created = make_log(authed)

        response = authed.post(
            f"/api/food/log/{created['id']}/photo",
            data={},
            content_type='multipart/form-data',
        )

        assert response.status_code == 400

    def test_replacing_a_photo_removes_the_old_file(self, authed, uploads):
        created = make_log(authed)

        first = authed.post(
            f"/api/food/log/{created['id']}/photo",
            data={'photo': (io.BytesIO(b'first'), 'a.jpg')},
            content_type='multipart/form-data',
        ).get_json()['photo_url']

        second = authed.post(
            f"/api/food/log/{created['id']}/photo",
            data={'photo': (io.BytesIO(b'second'), 'b.jpg')},
            content_type='multipart/form-data',
        ).get_json()['photo_url']

        assert first != second
        assert not os.path.isfile(os.path.join(str(uploads), first))
        assert os.path.isfile(os.path.join(str(uploads), second))

    def test_delete_clears_photo_url_and_file(self, authed, uploads):
        created = make_log(authed)
        photo_url = authed.post(
            f"/api/food/log/{created['id']}/photo",
            data={'photo': (io.BytesIO(b'bytes'), 'meal.jpg')},
            content_type='multipart/form-data',
        ).get_json()['photo_url']

        response = authed.delete(f"/api/food/log/{created['id']}/photo")

        assert response.status_code == 200
        assert not os.path.isfile(os.path.join(str(uploads), photo_url))
        fetched = authed.get(f"/api/food/log/{created['id']}").get_json()
        assert fetched['photo_url'] is None

    def test_delete_without_photo_returns_404(self, authed, uploads):
        created = make_log(authed)

        response = authed.delete(f"/api/food/log/{created['id']}/photo")

        assert response.status_code == 404

    def test_upload_on_unknown_log_returns_404(self, authed, uploads):
        response = authed.post(
            '/api/food/log/999999/photo',
            data={'photo': (io.BytesIO(b'bytes'), 'meal.jpg')},
            content_type='multipart/form-data',
        )

        assert response.status_code == 404

    def test_upload_to_other_users_log_returns_404(
        self, authed, app, other_user, uploads
    ):
        log_id = make_foreign_log(app, other_user)

        response = authed.post(
            f"/api/food/log/{log_id}/photo",
            data={'photo': (io.BytesIO(b'bytes'), 'meal.jpg')},
            content_type='multipart/form-data',
        )

        assert response.status_code == 404

    def test_served_photo_requires_login(self, authed, uploads, app):
        created = make_log(authed)
        photo_url = authed.post(
            f"/api/food/log/{created['id']}/photo",
            data={'photo': (io.BytesIO(b'image-bytes'), 'meal.jpg')},
            content_type='multipart/form-data',
        ).get_json()['photo_url']

        # Log out rather than spinning up a second client: this suite's client
        # keeps a preserved request context, so any new client inherits the
        # authenticated session and would not be anonymous.
        authed.post('/api/auth/logout')
        response = authed.get(f'/api/food/uploads/{photo_url}')

        assert response.status_code == 401

    def test_served_photo_returns_the_bytes(self, authed, uploads):
        created = make_log(authed)
        photo_url = authed.post(
            f"/api/food/log/{created['id']}/photo",
            data={'photo': (io.BytesIO(b'image-bytes'), 'meal.jpg')},
            content_type='multipart/form-data',
        ).get_json()['photo_url']

        response = authed.get(f'/api/food/uploads/{photo_url}')

        assert response.status_code == 200
        assert response.data == b'image-bytes'


class TestListAndRecentIncludePhotos:
    def test_log_list_includes_photo_and_servings(self, authed, uploads):
        created = make_log(authed)
        authed.post(
            f"/api/food/log/{created['id']}/photo",
            data={'photo': (io.BytesIO(b'bytes'), 'meal.jpg')},
            content_type='multipart/form-data',
        )

        response = authed.get('/api/food/log', query_string={'date': '2026-06-10'})
        logs = response.get_json()['logs']

        assert len(logs) == 1
        assert logs[0]['number_of_servings'] == 1.5
        assert logs[0]['photo_url'].startswith('food_log_photos/')

    def test_recent_uses_the_most_recent_photo(self, authed, app, test_user):
        today = date.today()
        with app.app_context():
            food = Food(user_id=test_user.id, name='Yogurt', calories=120)
            db.session.add(food)
            db.session.commit()
            food_id = food.id

            older = FoodLog(
                user_id=test_user.id,
                food_id=food_id,
                food_name='Yogurt',
                calories=120,
                date=today - timedelta(days=2),
                meal_type='snack',
                photo_url='food_log_photos/older.jpg',
            )
            newer = FoodLog(
                user_id=test_user.id,
                food_id=food_id,
                food_name='Yogurt',
                calories=120,
                date=today - timedelta(days=1),
                meal_type='snack',
                photo_url='food_log_photos/newer.jpg',
            )
            db.session.add_all([older, newer])
            db.session.commit()

        response = authed.get('/api/food/recent', query_string={'days': 7})
        entry = next(
            row for row in response.get_json() if row['food_id'] == food_id
        )

        assert entry['photo_url'] == 'food_log_photos/newer.jpg'

    def test_recent_falls_back_to_older_photo_when_latest_has_none(
        self, authed, app, test_user
    ):
        today = date.today()
        with app.app_context():
            food = Food(user_id=test_user.id, name='Crackers', calories=90)
            db.session.add(food)
            db.session.commit()
            food_id = food.id

            with_photo = FoodLog(
                user_id=test_user.id,
                food_id=food_id,
                food_name='Crackers',
                calories=90,
                date=today - timedelta(days=2),
                meal_type='snack',
                photo_url='food_log_photos/only.jpg',
            )
            without_photo = FoodLog(
                user_id=test_user.id,
                food_id=food_id,
                food_name='Crackers',
                calories=90,
                date=today - timedelta(days=1),
                meal_type='snack',
            )
            db.session.add_all([with_photo, without_photo])
            db.session.commit()

        response = authed.get('/api/food/recent', query_string={'days': 7})
        entry = next(
            row for row in response.get_json() if row['food_id'] == food_id
        )

        assert entry['photo_url'] == 'food_log_photos/only.jpg'

