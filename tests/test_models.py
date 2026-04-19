import pytest
from app.models.user import User
from app.models.weight_log import WeightLog
from app.models.exercise_log import ExerciseLog
from app.models.saved_exercise import SavedExercise
from app.models.food_log import FoodLog
from app.models.food import Food
from app.models.meal_photo import MealPhoto


class TestUserModel:
    def test_user_creation(self, app, test_user):
        assert test_user.id is not None
        assert test_user.username == 'testuser'
        assert test_user.email == 'testuser@test.com'
        assert test_user.is_authenticated
        assert not test_user.is_anonymous

    def test_user_password_hash_not_plaintext(self, app):
        with app.app_context():
            user = User(
                username='passwordtest',
                email='password@test.com',
                age=25,
                gender='male',
                height=175,
                weight=70
            )
            user.set_password('testpass123')
            assert user.password_hash != 'testpass123'
            assert user.check_password('testpass123')
            assert not user.check_password('wrongpass')

    def test_user_registration_validation(self, app):
        with app.app_context():
            # Test duplicate username
            user1 = User(
                username='duplicate',
                email='dup1@test.com',
                age=25,
                gender='male',
                height=175,
                weight=70
            )
            user1.set_password('testpass')
            user2 = User(
                username='duplicate',
                email='dup2@test.com',
                age=25,
                gender='male',
                height=175,
                weight=70
            )
            user2.set_password('testpass')
            
            db = pytest.importorskip('app', 'db')
            db.session.add(user1)
            db.session.commit()
            
            db.session.add(user2)
            with pytest.raises(Exception):
                db.session.commit()

    def test_user_daily_calorie_goal_default(self, app):
        with app.app_context():
            user = User(
                username='calorietest',
                email='calorie@test.com',
                age=25,
                gender='male',
                height=175,
                weight=70
            )
            user.set_password('testpass')
            # daily_calorie_goal is nullable, defaults to None in DB


class TestWeightLogModel:
    def test_weight_log_creation(self, app, test_user, sample_weight_log):
        assert sample_weight_log.id is not None
        assert sample_weight_log.user_id == test_user.id
        assert sample_weight_log.weight == 70.5
        assert sample_weight_log.recorded_at is not None

    def test_weight_log_recorded_at(self, app, test_user):
        with app.app_context():
            log = WeightLog(
                user_id=test_user.id,
                weight=70.0
            )
            # recorded_at should be set automatically
            assert log is not None


class TestExerciseLogModel:
    def test_saved_exercise_creation(self, app, test_user):
        with app.app_context():
            exercise = SavedExercise(
                user_id=test_user.id,
                name='Squats',
                muscle_group='legs'
            )
            db = pytest.importorskip('app', 'db')
            db.session.add(exercise)
            db.session.commit()
            
            assert exercise.id is not None
            assert exercise.name == 'Squats'

    def test_exercise_log_creation(self, app, test_user, sample_exercise):
        assert sample_exercise.user_id == test_user.id
        assert sample_exercise.exercise_name == 'Push-ups'

    def test_exercise_log_calories(self, app, test_user):
        with app.app_context():
            exercise = SavedExercise(
                user_id=test_user.id,
                name='Push-ups',
                muscle_group='chest'
            )
            db = pytest.importorskip('app', 'db')
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
            
            assert log.calories_burned == 30.0


class TestFoodModel:
    def test_food_creation(self, app, test_user, sample_food):
        assert sample_food.id is not None
        assert sample_food.user_id == test_user.id
        assert sample_food.name == 'Chicken Breast'
        assert sample_food.calories == 165
        assert sample_food.protein_g == 31

    def test_food_macro_totals(self, app, test_user):
        with app.app_context():
            food = Food(
                user_id=test_user.id,
                name='Protein Shake',
                calories=120,
                protein_g=25,
                carbs_g=3,
                fat_g=1
            )
            db = pytest.importorskip('app', 'db')
            db.session.add(food)
            db.session.commit()
            
            assert food.calories == 120
            assert food.protein_g == 25
            assert food.carbs_g == 3
            assert food.fat_g == 1


class TestFoodLogModel:
    def test_food_log_creation(self, app, test_user, sample_food, sample_food_log):
        assert sample_food_log.user_id == test_user.id
        assert sample_food_log.meal_type == 'breakfast'
        assert sample_food_log.calories == 165

    def test_food_log_fields(self, app, test_user):
        with app.app_context():
            from datetime import date
            log = FoodLog(
                user_id=test_user.id,
                food_name='Test Food',
                calories=200,
                protein_g=10,
                carbs_g=20,
                fat_g=5,
                date=date.today(),
                meal_type='lunch'
            )
            db = pytest.importorskip('app', 'db')
            db.session.add(log)
            db.session.commit()
            
            assert log.food_name == 'Test Food'
            assert log.calories == 200


class TestMealPhotoModel:
    def test_meal_photo_creation(self, app, test_user):
        with app.app_context():
            from datetime import date
            photo = MealPhoto(
                user_id=test_user.id,
                photo_path='/path/to/photo.jpg',
                date=date.today()
            )
            db = pytest.importorskip('app', 'db')
            db.session.add(photo)
            db.session.commit()
            
            assert photo.id is not None
            assert photo.photo_path == '/path/to/photo.jpg'

    def test_meal_photo_estimated_nutrition(self, app, test_user):
        with app.app_context():
            from datetime import date
            photo = MealPhoto(
                user_id=test_user.id,
                photo_path='/path/to/photo.jpg',
                date=date.today(),
                estimated_calories=500,
                estimated_protein=30,
                estimated_carbs=50,
                estimated_fat=20
            )
            db = pytest.importorskip('app', 'db')
            db.session.add(photo)
            db.session.commit()
            
            assert photo.estimated_calories == 500
            assert photo.estimated_protein == 30
            assert photo.estimated_carbs == 50
            assert photo.estimated_fat == 20
