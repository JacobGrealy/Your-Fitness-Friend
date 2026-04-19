from app.routes.auth import bp as auth_bp
from app.routes.weight import bp as weight_bp
from app.routes.exercise import bp as exercise_bp
from app.routes.food_routes import bp as food_bp
from app.routes.meals import bp as meals_bp
from app.routes.user import bp as user_bp
from app.routes.dashboard import bp as dashboard_bp

__all__ = [
    'auth_bp',
    'weight_bp',
    'exercise_bp',
    'food_bp',
    'meals_bp',
    'user_bp',
    'dashboard_bp'
]
