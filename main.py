from app import create_app, db
from app.models.user import User
from app.models.weight_log import WeightLog
from app.models.exercise_log import ExerciseLog
from app.models.saved_exercise import SavedExercise
from app.models.food import Food
from app.models.food_log import FoodLog
from app.models.meal_photo import MealPhoto

app = create_app()


@app.cli.command("init-db")
def init_db():
    """Initialize the database."""
    db.create_all()
    print("Database initialized successfully!")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5000)
    parser.add_argument('--host', type=str, default='127.0.0.1')
    args = parser.parse_args()
    app.run(debug=True, host=args.host, port=args.port)
