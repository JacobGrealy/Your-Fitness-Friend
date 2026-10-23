from datetime import date
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

import pytest
from PIL import Image
from app import db
from app.models.food_log import FoodLog
from app.models.meal_photo import MealPhoto
from app.utils.uploads import stored_file_path, references_to
from app.utils.photo_thumbnails import cache_path, thumbnail_file


def image():
    buffer = BytesIO()
    Image.new('RGB', (900, 600), 'blue').save(buffer, 'PNG')
    buffer.seek(0)
    return buffer


def upload(client):
    response = client.post('/api/auth/profile-photo', data={'photo': (image(), 'avatar.png')})
    assert response.status_code == 200
    return response.json['profile_photo_url']


def test_actual_avatar_upload_bare_reference_thumbnail_replace_delete(authenticated_client, test_user):
    c = authenticated_client
    filename = upload(c)
    assert test_user.profile_photo_path == filename
    assert '/' not in filename
    stored = 'profile_photos/' + filename
    original = Path(stored_file_path(stored)).read_bytes()
    response = c.get('/api/auth/uploads/' + filename + '?thumbnail=1')
    assert response.status_code == 200
    assert max(Image.open(BytesIO(response.data)).size) <= 320
    assert references_to(stored) == 1
    assert Path(stored_file_path(stored)).read_bytes() == original
    second = upload(c)
    assert not Path(stored_file_path(stored)).exists()
    assert not Path(cache_path(stored)).exists()
    assert c.get('/api/auth/uploads/' + second + '?thumbnail=1').status_code == 200
    assert c.delete('/api/auth/profile-photo').status_code == 200
    assert not Path(stored_file_path('profile_photos/' + second)).exists()
    assert not Path(cache_path('profile_photos/' + second)).exists()


def test_failed_avatar_delete_preserves_original_and_derivative(authenticated_client, test_user):
    filename = upload(authenticated_client)
    stored = 'profile_photos/' + filename
    thumbnail_file(stored)
    with patch.object(db.session, 'commit', side_effect=RuntimeError('commit failed')):
        with pytest.raises(RuntimeError):
            authenticated_client.delete('/api/auth/profile-photo')
    assert test_user.profile_photo_path == filename
    assert Path(stored_file_path(stored)).exists()
    assert Path(cache_path(stored)).exists()


def test_avatar_delete_preserves_shared_food_photo(authenticated_client, test_user):
    filename = upload(authenticated_client)
    stored = 'profile_photos/' + filename
    thumbnail_file(stored)
    db.session.add(FoodLog(user_id=test_user.id, food_name='Shared image', calories=100, date=date.today(), meal_type='lunch', photo_url=stored))
    db.session.commit()
    assert references_to(stored) == 2
    assert authenticated_client.delete('/api/auth/profile-photo').status_code == 200
    assert Path(stored_file_path(stored)).exists()
    assert Path(cache_path(stored)).exists()


def test_meal_delete_cleans_derivative_after_last_reference(authenticated_client, test_user):
    stored = 'meal_photos/meal.png'
    path = Path(stored_file_path(stored))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(image().read())
    meal = MealPhoto(user_id=test_user.id, photo_path=stored)
    db.session.add(meal); db.session.commit()
    thumbnail_file(stored)
    assert authenticated_client.delete(f'/api/meals/{meal.id}').status_code == 200
    assert not path.exists()
    assert not Path(cache_path(stored)).exists()
