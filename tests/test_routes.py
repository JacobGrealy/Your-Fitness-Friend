import io

import pytest


class TestAuthRoutes:
    def test_register_validation(self, client):
        response = client.post('/api/auth/register', json={
            'username': 'validuser',
            'password': 'validpass123',
            'email': 'valid@test.com',
            'age': 25,
            'gender': 'female',
            'height': 165,
            'weight': 60
        })
        assert response.status_code == 201

    def test_register_missing_fields(self, client):
        response = client.post('/api/auth/register', json={
            'username': 'incomplete'
        })
        assert response.status_code == 400

    def test_login_success(self, client):
        client.post('/api/auth/register', json={
            'username': 'testuser',
            'password': 'testpass123',
            'email': 'test@test.com',
            'age': 25,
            'gender': 'male',
            'height': 175,
            'weight': 70
        })
        response = client.post('/api/auth/login', json={
            'username': 'testuser',
            'password': 'testpass123'
        })
        assert response.status_code == 200

    def test_login_wrong_password(self, client):
        client.post('/api/auth/register', json={
            'username': 'testuser2',
            'password': 'testpass123',
            'email': 'test2@test.com',
            'age': 25,
            'gender': 'male',
            'height': 175,
            'weight': 70
        })
        client.post('/api/auth/logout')
        response = client.post('/api/auth/login', json={
            'username': 'testuser2',
            'password': 'wrongpassword'
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post('/api/auth/login', json={
            'username': 'nonexistent',
            'password': 'password'
        })
        assert response.status_code == 401

    def test_profile_update_weight_goal(self, client):
        client.post('/api/auth/register', json={
            'username': 'profileuser',
            'password': 'testpass123',
            'email': 'profile@test.com',
            'age': 25,
            'gender': 'female',
            'height': 165,
            'weight': 60
        })
        client.post('/api/auth/login', json={
            'email': 'profile@test.com',
            'password': 'testpass123'
        })
        response = client.put('/api/auth/profile', json={
            'weight_goal_lbs': 180.0
        })
        assert response.status_code == 200
        assert response.get_json()['user']['weight_goal_lbs'] == 180.0
        get_response = client.get('/api/auth/profile')
        assert get_response.status_code == 200
        assert get_response.get_json()['weight_goal_lbs'] == 180.0


class TestWeightRoutes:
    def test_weight_log_create(self, authenticated_client):
        response = authenticated_client.post('/api/weight/logs', json={
            'weight': 70.5,
            'notes': 'Morning weigh-in'
        })
        assert response.status_code == 201

    def test_weight_log_list(self, authenticated_client):
        response = authenticated_client.get('/api/weight/logs')
        assert response.status_code == 200

    def test_weight_photo_round_trip(self, authenticated_client, app, tmp_path):
        app.config['UPLOAD_FOLDER'] = str(tmp_path / 'uploads')

        upload = authenticated_client.post(
            '/api/weight/photo',
            data={'photo': (io.BytesIO(b'weight-image'), 'shot.jpg')},
            content_type='multipart/form-data',
        )
        assert upload.status_code == 201
        photo_url = upload.get_json()['photo_url']
        assert photo_url.startswith('weight_photos/')

        # The frontend builds ${origin}/api/weight/uploads/${photo_url}, so the
        # stored relative path has to resolve. It used to nest again under
        # weight_photos/ and 404.
        served = authenticated_client.get(f'/api/weight/uploads/{photo_url}')
        assert served.status_code == 200
        assert served.data == b'weight-image'


class TestExerciseRoutes:
    def test_saved_exercise_create(self, authenticated_client):
        response = authenticated_client.post('/api/exercise/save', json={
            'name': 'Bench Press',
            'muscle_group': 'chest'
        })
        assert response.status_code == 201

    def test_saved_exercise_list(self, authenticated_client):
        response = authenticated_client.get('/api/exercise/saved')
        assert response.status_code == 200

    def test_exercise_log_create(self, authenticated_client, monkeypatch):
        from app.utils.qwen_client import qwen_client

        # Keep the test hermetic: exercise logging asks the local model first
        monkeypatch.setattr(
            qwen_client, 'estimate_exercise_calories',
            lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError('no model')),
        )
        response = authenticated_client.post('/api/exercise/log', json={
            'exercise_name': 'Push-ups',
            'duration_min': 15,
            'calories_burned': 100
        })
        assert response.status_code == 201


class TestFoodRoutes:
    def test_custom_food_create(self, authenticated_client):
        response = authenticated_client.post('/api/food', json={
            'name': 'Homemade Salad',
            'calories': 250,
            'protein_g': 10,
            'carbs_g': 30,
            'fat_g': 8
        })
        assert response.status_code == 201

    def test_custom_food_list(self, authenticated_client):
        response = authenticated_client.get('/api/food')
        assert response.status_code == 200

    def test_food_log_create(self, authenticated_client):
        response = authenticated_client.post('/api/food/log', json={
            'food_name': 'Test Food',
            'calories': 200,
            'protein_g': 10,
            'carbs_g': 20,
            'fat_g': 5,
            'meal_type': 'breakfast',
            'date': '2026-06-10'
        })
        assert response.status_code == 201

    def test_daily_food_totals(self, authenticated_client):
        response = authenticated_client.get('/api/food/daily')
        assert response.status_code == 200


class TestMealPhotoRoutes:
    def test_meal_photo_upload(self, authenticated_client, monkeypatch):
        from app.utils.qwen_client import qwen_client

        # Uploading triggers AI analysis; stub it so no real model is called
        monkeypatch.setattr(
            qwen_client, 'analyze_meal_photo',
            lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError('no model')),
        )
        response = authenticated_client.post(
            '/api/meals/photo',
            data={'photo': (io.BytesIO(b'test.jpg'), 'test.jpg')},
            content_type='multipart/form-data'
        )
        assert response.status_code in [200, 201, 400, 415]

    def test_meal_photo_list(self, authenticated_client):
        response = authenticated_client.get('/api/meals/')
        assert response.status_code == 200


class TestDashboardRoutes:
    def test_daily_summary(self, authenticated_client):
        response = authenticated_client.get('/api/dashboard/daily')
        assert response.status_code == 200

    def test_weight_trend(self, authenticated_client):
        response = authenticated_client.get('/api/dashboard/weight-trend')
        assert response.status_code == 200

    def test_weekly_summary(self, authenticated_client):
        response = authenticated_client.get('/api/dashboard/weekly-summary')
        assert response.status_code == 200


class TestProfilePhotoRoutes:
    def _register_and_login(self, client):
        client.post('/api/auth/register', json={
            'username': 'photouser',
            'password': 'testpass123',
            'email': 'photo@test.com',
            'age': 25,
            'gender': 'male',
            'height': 175,
            'weight': 70
        })
        client.post('/api/auth/login', json={
            'email': 'photo@test.com',
            'password': 'testpass123'
        })

    def test_upload_profile_photo_success(self, client):
        self._register_and_login(client)
        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        response = client.post(
            '/api/auth/profile-photo',
            data={'photo': (io.BytesIO(jpeg_header + b'\x00' * 100), 'test.jpg')}
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'profile_photo_url' in data
        assert data['profile_photo_url'].endswith('.jpg')

    def test_upload_profile_photo_no_file(self, client):
        self._register_and_login(client)
        response = client.post(
            '/api/auth/profile-photo',
            data={},
            content_type='multipart/form-data'
        )
        assert response.status_code == 400

    def test_upload_profile_photo_invalid_type(self, client):
        self._register_and_login(client)
        response = client.post(
            '/api/auth/profile-photo',
            data={'photo': (io.BytesIO(b'test content'), 'test.txt')}
        )
        assert response.status_code == 400

    def test_delete_profile_photo(self, client):
        self._register_and_login(client)
        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        response = client.post(
            '/api/auth/profile-photo',
            data={'photo': (io.BytesIO(jpeg_header + b'\x00' * 100), 'test.jpg')}
        )
        assert response.status_code == 200
        response = client.delete('/api/auth/profile-photo')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_serve_profile_photo(self, client):
        self._register_and_login(client)
        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        response = client.post(
            '/api/auth/profile-photo',
            data={'photo': (io.BytesIO(jpeg_header + b'\x00' * 100), 'test.jpg')}
        )
        data = response.get_json()
        photo_filename = data['profile_photo_url']
        response = client.get(f'/api/auth/uploads/{photo_filename}')
        assert response.status_code == 200

    def test_profile_photo_in_get_profile(self, client):
        self._register_and_login(client)
        response = client.get('/api/auth/profile')
        assert response.status_code == 200
        data = response.get_json()
        assert 'profile_photo_path' in data
        assert data['profile_photo_path'] is None


class TestSpaFallback:
    """The catch-all route must serve the SPA for pages but never for /api."""

    def test_unknown_api_path_returns_json_404(self, client):
        response = client.get('/api/does-not-exist')

        assert response.status_code == 404
        assert response.is_json
        assert response.get_json() == {'error': 'Not found'}

    def test_bare_api_prefix_returns_json_404(self, client):
        response = client.get('/api')

        assert response.status_code == 404
        assert response.is_json

    def test_spa_route_still_serves_index(self, client):
        response = client.get('/dashboard')

        assert response.status_code == 200
        assert response.mimetype == 'text/html'


class TestManualCalorieGoal:
    """FF-0017: a goal the user sets by hand must survive recalculation."""

    def test_profile_exposes_the_manual_flag(self, authenticated_client):
        response = authenticated_client.get('/api/auth/profile')

        assert response.status_code == 200
        assert 'calorie_goal_manual' in response.get_json()

    def test_setting_a_goal_stores_it_and_flags_it_manual(self, authenticated_client):
        response = authenticated_client.put('/api/auth/profile', json={'daily_calorie_goal': 2350})

        assert response.status_code == 200
        body = response.get_json()['user']
        assert body['daily_calorie_goal'] == 2350
        assert body['calorie_goal_manual'] is True

        profile = authenticated_client.get('/api/auth/profile').get_json()
        assert profile['daily_calorie_goal'] == 2350
        assert profile['calorie_goal_manual'] is True

    def test_a_manual_goal_survives_a_later_profile_edit(self, authenticated_client):
        authenticated_client.put('/api/auth/profile', json={'daily_calorie_goal': 2350})

        # A complete profile now recalculates from BMR/TDEE; the manual goal must
        # not be clobbered by it.
        response = authenticated_client.put('/api/auth/profile', json={
            'age': 34, 'gender': 'male', 'height': 180, 'weight': 85,
            'activity_level': 'moderate', 'weekly_goal': 'lose_1',
        })

        assert response.status_code == 200
        body = response.get_json()['user']
        assert body['daily_calorie_goal'] == 2350
        assert body['calorie_goal_manual'] is True

    def test_clearing_the_flag_hands_control_back_to_the_calculation(self, authenticated_client):
        authenticated_client.put('/api/auth/profile', json={'daily_calorie_goal': 2350})

        cleared = authenticated_client.put('/api/auth/profile', json={
            'calorie_goal_manual': False,
            'age': 34, 'gender': 'male', 'height': 180, 'weight': 85,
            'activity_level': 'moderate', 'weekly_goal': 'lose_1',
        })

        assert cleared.status_code == 200
        body = cleared.get_json()['user']
        assert body['calorie_goal_manual'] is False
        assert body['daily_calorie_goal'] != 2350

    @pytest.mark.parametrize('value', [0, 499, 10001, 999999])
    def test_out_of_range_goals_are_rejected(self, authenticated_client, value):
        response = authenticated_client.put('/api/auth/profile', json={'daily_calorie_goal': value})

        assert response.status_code == 400
        assert 'between' in response.get_json()['error']

    def test_non_numeric_goal_is_rejected(self, authenticated_client):
        response = authenticated_client.put('/api/auth/profile', json={'daily_calorie_goal': 'lots'})

        assert response.status_code == 400
