"""Profile photo uploads must not leave unreferenced files (FF-0080).

Two leaks existed: a failed commit left the newly written file on disk with nothing
pointing at it, and a second upload deleted the previous photo *before* the new one was
saved, so a failed upload could leave the user with no avatar at all.

(The bulk of the historic orphans came from the test suite writing into app/uploads on
every run, which FF-0079 fixed by pointing tests at a scratch directory.)
"""

import io
import os

import pytest

from app import db
from app.models.user import User
from app.utils.uploads import upload_dir

PNG = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06'
    b'\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00'
    b'\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
)


def _upload(client, name='me.png'):
    return client.post(
        '/api/auth/profile-photo',
        data={'photo': (io.BytesIO(PNG), name)},
        content_type='multipart/form-data',
    )


@pytest.fixture
def logged_in(client, app):
    client.post('/api/auth/register', json={
        'email': 'avatar@test.local', 'password': 'password123', 'name': 'Avatar',
    })
    client.post('/api/auth/logout')
    client.post('/api/auth/login', json={
        'email': 'avatar@test.local', 'password': 'password123',
    })
    return client


class TestProfilePhotoFiles:
    def test_upload_leaves_exactly_one_file_for_the_user(self, logged_in, app):
        response = _upload(logged_in)
        assert response.status_code == 200

        with app.app_context():
            user = User.query.filter_by(email='avatar@test.local').first()
            folder = upload_dir('profile_photos')
            files = os.listdir(folder)

            assert user.profile_photo_path in files
            # Tests run against a scratch uploads dir (FF-0079), so it started empty.
            assert len(files) == 1

    def test_replacing_removes_the_previous_file(self, logged_in, app):
        first = _upload(logged_in).get_json()['profile_photo_url']
        second = _upload(logged_in, 'again.png').get_json()['profile_photo_url']

        with app.app_context():
            folder = upload_dir('profile_photos')
            files = os.listdir(folder)
            assert second in files
            assert first not in files, 'the replaced photo was left behind'

    def test_a_failed_commit_removes_the_new_file(self, logged_in, app, monkeypatch):
        """The leak: file saved, commit fails, nothing points at the file."""
        from app.routes import auth as auth_module

        def boom():
            raise RuntimeError('commit failed')

        monkeypatch.setattr(db.session, 'commit', boom)

        with app.app_context():
            folder = upload_dir('profile_photos')
            before = set(os.listdir(folder))

        with pytest.raises(RuntimeError):
            _upload(logged_in, 'doomed.png')

        with app.app_context():
            after = set(os.listdir(upload_dir('profile_photos')))
            assert after == before, f'orphan left behind: {after - before}'

    def test_a_failed_upload_keeps_the_existing_photo(self, logged_in, app, monkeypatch):
        """The old file must not be deleted before the new one is safely committed."""
        first = _upload(logged_in).get_json()['profile_photo_url']

        def boom():
            raise RuntimeError('commit failed')

        monkeypatch.setattr(db.session, 'commit', boom)
        with pytest.raises(RuntimeError):
            _upload(logged_in, 'second.png')
        monkeypatch.undo()

        with app.app_context():
            folder = upload_dir('profile_photos')
            assert first in os.listdir(folder), 'the previous avatar was destroyed'
            user = User.query.filter_by(email='avatar@test.local').first()
            assert user.profile_photo_path == first
