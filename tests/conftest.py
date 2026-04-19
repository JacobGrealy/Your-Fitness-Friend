import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.user import User
from app.models.weight_log import WeightLog
from app.models.exercise_log import ExerciseLog
from app.models.saved_exercise import SavedExercise
from app.models.food_log import FoodLog
from app.models.food import Food
from app.models.meal_photo import MealPhoto


@pytest.fixture
def app():
    app = create_app('testing')
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SECRET_KEY': 'test-secret-key-for-testing-only',
        'WTF_CSRF_ENABLED': False
    })
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def runner(app):
    return app.test_cli_runner()


@pytest.fixture
def auth(client):
    def login_user(username='testuser', password='testpass123'):
        return client.post('/api/auth/register', json={
            'username': username,
            'password': password,
            'email': f'{username}@test.com',
            'age': 25,
            'gender': 'male',
            'height': 175,
            'weight': 70
        })
    
    def logout_user():
        return client.post('/api/auth/logout')
    
    return {'login': login_user, 'logout': logout_user}


@pytest.fixture
def test_user(app):
    with app.app_context():
        user = User(
            username='testuser',
            email='testuser@test.com',
            age=25,
            gender='male',
            height=175,
            weight=70
        )
        user.set_password('testpass123')
        db.session.add(user)
        db.session.commit()
        yield user
        db.session.delete(user)


@pytest.fixture
def authenticated_client(client, test_user):
    client.post('/api/auth/login', json={
        'username': 'testuser',
        'password': 'testpass123'
    })
    return client


@pytest.fixture
def sample_weight_log(app, test_user):
    with app.app_context():
        log = WeightLog(
            user_id=test_user.id,
            weight=70.5,
            notes='Morning weigh-in'
        )
        db.session.add(log)
        db.session.commit()
        yield log
        db.session.delete(log)


@pytest.fixture
def sample_exercise(app, test_user):
    with app.app_context():
        exercise = SavedExercise(
            user_id=test_user.id,
            name='Push-ups',
            muscle_group='chest'
        )
        db.session.add(exercise)
        db.session.commit()
        
        log = ExerciseLog(
            user_id=test_user.id,
            saved_exercise_id=exercise.id,
            exercise_name='Push-ups',
            duration=5.0,
            calories_burned=30.0
        )
        db.session.add(log)
        db.session.commit()
        yield log
        db.session.delete(log)
        db.session.delete(exercise)


@pytest.fixture
def sample_food(app, test_user):
    with app.app_context():
        food = Food(
            user_id=test_user.id,
            name='Chicken Breast',
            calories=165,
            protein_g=31,
            carbs_g=0,
            fat_g=3.6
        )
        db.session.add(food)
        db.session.commit()
        yield food
        db.session.delete(food)


@pytest.fixture
def sample_food_log(app, test_user, sample_food):
    with app.app_context():
        from datetime import date
        log = FoodLog(
            user_id=test_user.id,
            food_name=sample_food.name,
            calories=sample_food.calories,
            protein_g=sample_food.protein_g,
            carbs_g=sample_food.carbs_g,
            fat_g=sample_food.fat_g,
            date=date.today(),
            meal_type='breakfast'
        )
        db.session.add(log)
        db.session.commit()
        yield log
        db.session.delete(log)
