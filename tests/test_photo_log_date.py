from datetime import date
from io import BytesIO
from unittest.mock import patch

import pytest
from app.models.food_log import FoodLog

MODULE = 'app.routes.meals_ai_log.'


def test_initial_photo_and_followup_use_requested_day(authenticated_client):
    with patch(MODULE + 'save_uploaded_file', return_value=('food_photos/test.jpg', None)), \
         patch(MODULE + 'encode_image_for_ai', return_value='image'), \
         patch(MODULE + 'qwen_client.analyze_meal_photo', return_value={'calories': 120, 'protein': 2, 'carbs': 20, 'fat': 4, 'items': ['Toast']}):
        response = authenticated_client.post('/api/meals/ai-log', data={'date': '2026-01-12', 'meal_type': 'breakfast', 'photo': (BytesIO(b'image'), 'meal.jpg')})
    assert response.status_code == 200
    assert FoodLog.query.one().date == date(2026, 1, 12)
    with patch(MODULE + 'qwen_client.chat', return_value='{"calories":50,"protein":1,"carbs":10,"fat":1}'):
        response = authenticated_client.post('/api/meals/ai-log', json={'date': '2026-01-12', 'conversation_history': [], 'user_message': 'Add toast'})
    assert response.status_code == 200
    assert FoodLog.query.count() == 2
    assert all(log.date == date(2026, 1, 12) for log in FoodLog.query.all())


@pytest.mark.parametrize('value', ['20260112', '2026-02-30', '', None, 123])
def test_invalid_photo_date_rejected_before_upload_or_model(authenticated_client, value):
    with patch(MODULE + 'save_uploaded_file') as save, patch(MODULE + 'qwen_client.chat') as chat:
        response = authenticated_client.post('/api/meals/ai-log', json={'date': value, 'conversation_history': [], 'user_message': 'Add toast'})
        assert response.status_code == 400
        save.assert_not_called()
        chat.assert_not_called()
    assert FoodLog.query.count() == 0


def test_missing_date_remains_backwards_compatible(authenticated_client):
    with patch(MODULE + 'qwen_client.chat', return_value='{"calories":50,"protein":1,"carbs":10,"fat":1}'):
        response = authenticated_client.post('/api/meals/ai-log', json={'conversation_history': [], 'user_message': 'Add toast'})
    assert response.status_code == 200
    assert FoodLog.query.one().date == date.today()
