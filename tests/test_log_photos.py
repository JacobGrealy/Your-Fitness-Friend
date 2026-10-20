"""Photos carried into a new log, and offering the last one (FF-0087).

The ownership rule from FF-0073/FF-0080: two log rows must never share one photo file, so a
carried photo is copied and each log owns its bytes.
"""

import datetime
import os

import pytest

from app import db
from app.models.food_log import FoodLog
from app.models.user import User
from app.utils.uploads import upload_dir

TODAY = datetime.date.today()
PNG = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06'
    b'\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00'
    b'\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
)


@pytest.fixture
def user_id(client, app):
    client.post('/api/auth/register', json={
        'email': 'logphoto@test.local', 'password': 'password123', 'name': 'Photo',
    })
    client.post('/api/auth/logout')
    client.post('/api/auth/login', json={
        'email': 'logphoto@test.local', 'password': 'password123',
    })
    with app.app_context():
        return User.query.filter_by(email='logphoto@test.local').first().id


def _stored_photo(name='existing.jpg'):
    """A real file in the uploads tree, as the photo endpoint would have written it."""
    folder = upload_dir('food_log_photos')
    with open(os.path.join(folder, name), 'wb') as handle:
        handle.write(PNG)
    return f'food_log_photos/{name}'


def _log(client, name='Eggo toaster sticks', photo_url=None, day=TODAY):
    payload = {
        'food_name': name, 'calories': 110, 'protein_g': 3, 'carbs_g': 20, 'fat_g': 4,
        'meal_type': 'breakfast', 'date': day.isoformat(), 'number_of_servings': 1,
    }
    if photo_url:
        payload['photo_url'] = photo_url
    return client.post('/api/food/log', json=payload)


class TestCarryingAPhotoIntoANewLog:
    """Photos are shared between rows, not copied (FF-0102, replacing FF-0087's copies).

    The copy existed because two rows pointing at one file had no clear owner when that
    file was deleted. Deletion is reference-aware now, so one file can serve many logs
    without the earlier breakage - and without storing one image five times.
    """

    def test_links_the_same_file_instead_of_copying_it(self, client, app, user_id):
        stored = _stored_photo()

        response = _log(client, photo_url=stored)

        assert response.status_code == 201
        assert response.get_json()['photo_url'] == stored, 'the carried photo is the same file'
        with app.app_context():
            folder = upload_dir('food_log_photos')
            assert os.listdir(folder).count(os.path.basename(stored)) == 1

    def test_deleting_one_photo_leaves_the_other_intact(self, client, app, user_id):
        stored = _stored_photo()
        first = _log(client, photo_url=stored).get_json()
        second = _log(client, photo_url=first['photo_url']).get_json()

        client.delete(f"/api/food/log/{first['id']}/photo")

        # the second log still shows the shared picture, and the file survives
        assert client.get(f"/api/food/log/{second['id']}").get_json()['photo_url'] == stored
        with app.app_context():
            assert os.path.basename(second['photo_url']) in os.listdir(upload_dir('food_log_photos'))

    def test_the_file_goes_when_its_last_reference_does(self, client, app, user_id):
        stored = _stored_photo()
        first = _log(client, photo_url=stored).get_json()
        second = _log(client, photo_url=stored).get_json()

        client.delete(f"/api/food/log/{first['id']}/photo")
        response = client.delete(f"/api/food/log/{second['id']}/photo")

        assert response.get_json()['file_kept'] is False
        with app.app_context():
            assert os.path.basename(stored) not in os.listdir(upload_dir('food_log_photos'))

    def test_a_missing_source_still_creates_the_log(self, client, app, user_id):
        response = _log(client, photo_url='food_log_photos/does-not-exist.jpg')

        assert response.status_code == 201
        assert response.get_json()['photo_url'] is None

    def test_a_path_outside_the_uploads_root_is_ignored(self, client, app, user_id):
        response = _log(client, photo_url='../../instance/fitness_friend.db')

        assert response.status_code == 201
        assert response.get_json()['photo_url'] is None


class TestLatestPhotoLookup:
    def test_returns_the_newest_photo_for_a_food(self, client, app, user_id):
        older = _log(client, photo_url=_stored_photo('older.jpg'), day=TODAY - datetime.timedelta(days=3)).get_json()
        newer = _log(client, photo_url=_stored_photo('newer.jpg'), day=TODAY).get_json()

        body = client.get('/api/food/latest-photo?food_name=Eggo toaster sticks').get_json()

        assert body['photo_url'] == newer['photo_url']
        assert body['log_id'] == newer['id']

    def test_skips_logs_without_a_photo(self, client, app, user_id):
        with_photo = _log(client, photo_url=_stored_photo('has.jpg'), day=TODAY - datetime.timedelta(days=1)).get_json()
        _log(client, day=TODAY)                       # newest, but no picture

        body = client.get('/api/food/latest-photo?food_name=Eggo toaster sticks').get_json()

        assert body['photo_url'] == with_photo['photo_url']

    def test_returns_null_for_a_food_never_photographed(self, client, app, user_id):
        _log(client)
        body = client.get('/api/food/latest-photo?food_name=Eggo toaster sticks').get_json()
        assert body['photo_url'] is None
        assert body['log_id'] is None

    def test_is_owner_scoped(self, client, app, user_id):
        _log(client, photo_url=_stored_photo())
        client.post('/api/auth/logout')
        client.post('/api/auth/register', json={
            'email': 'nosy@test.local', 'password': 'password123', 'name': 'Nosy',
        })
        client.post('/api/auth/logout')
        client.post('/api/auth/login', json={
            'email': 'nosy@test.local', 'password': 'password123',
        })

        body = client.get('/api/food/latest-photo?food_name=Eggo toaster sticks').get_json()

        assert body['photo_url'] is None
