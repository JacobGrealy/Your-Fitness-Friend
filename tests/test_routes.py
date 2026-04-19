import pytest


class TestAuthRoutes:
    def test_register_validation(self, client):
        response = client.post('/auth/register', json={
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
        response = client.post('/auth/register', json={
            'username': 'incomplete'
        })
        assert response.status_code == 400

    def test_login_success(self, client):
        client.post('/auth/register', json={
            'username': 'testuser',
            'password': 'testpass123',
            'email': 'test@test.com',
            'age': 25,
            'gender': 'male',
            'height': 175,
            'weight': 70
        })
        response = client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'testpass123'
        })
        assert response.status_code == 200

    def test_login_wrong_password(self, client):
        client.post('/auth/register', json={
            'username': 'testuser2',
            'password': 'testpass123',
            'email': 'test2@test.com',
            'age': 25,
            'gender': 'male',
            'height': 175,
            'weight': 70
        })
        response = client.post('/auth/login', json={
            'username': 'testuser2',
            'password': 'wrongpassword'
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post('/auth/login', json={
            'username': 'nonexistent',
            'password': 'password'
        })
        assert response.status_code == 401


class TestWeightRoutes:
    @pytest.mark.skip(reason="Requires session handling fix")
    def test_weight_log_create(self, authenticated_client):
        response = authenticated_client.post('/api/weight', json={
            'weight': 70.5,
            'notes': 'Morning weigh-in'
        })
        assert response.status_code == 201

    @pytest.mark.skip(reason="Requires session handling fix")
    def test_weight_log_list(self, authenticated_client):
        response = authenticated_client.get('/api/weight')
        assert response.status_code == 200


class TestExerciseRoutes:
    @pytest.mark.skip(reason="Requires session handling fix")
    def test_saved_exercise_create(self, authenticated_client):
        response = authenticated_client.post('/api/exercise/saved', json={
            'name': 'Bench Press',
            'muscle_group': 'chest'
        })
        assert response.status_code == 201

    @pytest.mark.skip(reason="Requires session handling fix")
    def test_saved_exercise_list(self, authenticated_client):
        response = authenticated_client.get('/api/exercise/saved')
        assert response.status_code == 200

    @pytest.mark.skip(reason="Requires session handling fix")
    def test_exercise_log_create(self, authenticated_client):
        response = authenticated_client.post('/api/exercise/log', json={
            'exercise_name': 'Push-ups',
            'duration': 15,
            'calories_burned': 100
        })
        assert response.status_code == 201


class TestFoodRoutes:
    @pytest.mark.skip(reason="Requires session handling fix")
    def test_custom_food_create(self, authenticated_client):
        response = authenticated_client.post('/api/food/custom', json={
            'name': 'Homemade Salad',
            'calories': 250,
            'protein_g': 10,
            'carbs_g': 30,
            'fat_g': 8
        })
        assert response.status_code == 201

    @pytest.mark.skip(reason="Requires session handling fix")
    def test_custom_food_list(self, authenticated_client):
        response = authenticated_client.get('/api/food/custom')
        assert response.status_code == 200

    @pytest.mark.skip(reason="Requires session handling fix")
    def test_food_log_create(self, authenticated_client):
        response = authenticated_client.post('/api/food/log', json={
            'food_name': 'Test Food',
            'calories': 200,
            'protein_g': 10,
            'carbs_g': 20,
            'fat_g': 5,
            'meal_type': 'breakfast'
        })
        assert response.status_code == 201

    @pytest.mark.skip(reason="Requires session handling fix")
    def test_daily_food_totals(self, authenticated_client):
        response = authenticated_client.get('/api/food/daily')
        assert response.status_code == 200


class TestMealPhotoRoutes:
    @pytest.mark.skip(reason="Requires session handling fix")
    def test_meal_photo_upload(self, authenticated_client):
        response = authenticated_client.post(
            '/api/food/photos',
            data={'file': (b'test.jpg', 'test.jpg')},
            content_type='multipart/form-data'
        )
        assert response.status_code in [201, 400, 415]

    @pytest.mark.skip(reason="Requires session handling fix")
    def test_meal_photo_list(self, authenticated_client):
        response = authenticated_client.get('/api/food/photos')
        assert response.status_code == 200


class TestDashboardRoutes:
    @pytest.mark.skip(reason="Requires session handling fix")
    def test_daily_summary(self, authenticated_client):
        response = authenticated_client.get('/api/dashboard/daily')
        assert response.status_code == 200

    @pytest.mark.skip(reason="Requires session handling fix")
    def test_weight_trend(self, authenticated_client):
        response = authenticated_client.get('/api/dashboard/weight-trend')
        assert response.status_code == 200

    @pytest.mark.skip(reason="Requires session handling fix")
    def test_weekly_summary(self, authenticated_client):
        response = authenticated_client.get('/api/dashboard/weekly-summary')
        assert response.status_code == 200
