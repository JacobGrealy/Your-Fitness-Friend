from datetime import datetime
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from app import db
from app.models.food_log import FoodLog
from app.models.exercise_log import ExerciseLog
from app.models.weight_log import WeightLog
from app.models.user import User
from app.utils.photo_thumbnails import cache_path, thumbnail_file
from app.utils.uploads import stored_file_path, remove_if_unreferenced


def photo(stored):
    path = Path(stored_file_path(stored))
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new('RGB', (1400, 900), 'blue').save(path, 'PNG')
    return path


def test_lazy_thumbnail_smaller_and_original_bytes_unchanged(authenticated_client, test_user):
    stored = 'food_log_photos/large.png'
    path = photo(stored)
    original = path.read_bytes()
    log = FoodLog(user_id=test_user.id, food_name='Meal', calories=100, date=datetime.now().date(), meal_type='lunch', photo_url=stored)
    db.session.add(log); db.session.commit()
    response = authenticated_client.get('/api/food/uploads/' + stored + '?thumbnail=1')
    assert response.status_code == 200
    assert response.mimetype == 'image/jpeg'
    with Image.open(BytesIO(response.data)) as image:
        assert max(image.size) <= 320
    assert len(response.data) < len(original)
    assert path.read_bytes() == original
    cached = Path(cache_path(stored))
    assert authenticated_client.get('/api/food/uploads/thumbnails/' + cached.name).status_code == 404
    assert authenticated_client.get('/api/weight/uploads/thumbnails/' + cached.name).status_code == 404
    before = cached.stat().st_mtime_ns
    again = authenticated_client.get('/api/food/uploads/' + stored + '?thumbnail=1')
    assert again.data == response.data
    assert cached.stat().st_mtime_ns == before
    full = authenticated_client.get('/api/food/uploads/' + stored)
    assert full.data == original


def test_derivative_access_owner_scoped(authenticated_client):
    stored = 'food_log_photos/private.png'
    photo(stored)
    other = User(username='thumb-other', email='thumb-other@example.com', password_hash='unused')
    db.session.add(other); db.session.flush()
    db.session.add(FoodLog(user_id=other.id, food_name='Private meal', calories=100, date=datetime.now().date(), meal_type='lunch', photo_url=stored))
    db.session.commit()
    assert authenticated_client.get('/api/food/uploads/' + stored + '?thumbnail=1').status_code == 404
    assert not Path(cache_path(stored)).exists()


def test_weight_profile_and_exercise_derivatives(authenticated_client, test_user):
    for stored in ('weight_photos/large.png', 'profile_photos/large.png', 'exercise_photos/large.png'):
        photo(stored)
    test_user.profile_photo_path = 'profile_photos/large.png'
    exercise = ExerciseLog(user_id=test_user.id, exercise_name='Walk', photo_url='exercise_photos/large.png')
    db.session.add_all([exercise, WeightLog(user_id=test_user.id, weight=200, recorded_at=datetime.now(), photo_url='weight_photos/large.png')]); db.session.commit()
    for url in ('/api/auth/uploads/large.png', '/api/weight/uploads/weight_photos/large.png', f'/api/exercise/log/{exercise.id}/photo'):
        response = authenticated_client.get(url + '?thumbnail=1')
        assert response.status_code == 200
        with Image.open(BytesIO(response.data)) as image:
            assert max(image.size) <= 320


def test_reference_aware_cleanup_preserves_shared_derivative(authenticated_client, test_user):
    stored = 'food_log_photos/shared.png'
    path = photo(stored)
    rows = [FoodLog(user_id=test_user.id, food_name='Meal', calories=100, date=datetime.now().date(), meal_type='lunch', photo_url=stored) for _ in range(2)]
    db.session.add_all(rows); db.session.commit()
    cached = Path(thumbnail_file(stored))
    db.session.delete(rows[0]); db.session.commit()
    assert remove_if_unreferenced(stored) is False
    assert path.exists() and cached.exists()
    db.session.delete(rows[1]); db.session.commit()
    assert remove_if_unreferenced(stored) is True
    assert not path.exists() and not cached.exists()


def test_failed_generation_leaves_original_and_no_temporary_file(authenticated_client, test_user):
    stored = 'food_log_photos/failure.png'
    path = photo(stored)
    original = path.read_bytes()
    db.session.add(FoodLog(user_id=test_user.id, food_name='Meal', calories=100, date=datetime.now().date(), meal_type='lunch', photo_url=stored)); db.session.commit()
    with patch('app.utils.photo_thumbnails.os.replace', side_effect=OSError('disk error')):
        response = authenticated_client.get('/api/food/uploads/' + stored + '?thumbnail=1')
    assert response.status_code == 200
    assert response.data == original
    assert path.read_bytes() == original
    assert list(Path(cache_path(stored)).parent.iterdir()) == []


def test_thumbnail_requires_authentication(client):
    assert client.get('/api/food/uploads/food_log_photos/file.jpg?thumbnail=1').status_code == 401
