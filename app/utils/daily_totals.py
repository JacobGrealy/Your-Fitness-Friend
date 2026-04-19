from datetime import date
from app.models.food_log import FoodLog
from app import db


def get_daily_totals(user_id, target_date=None):
    """Calculate daily nutritional totals for a user on a specific date."""
    if target_date is None:
        target_date = date.today()
    
    logs = FoodLog.query.filter_by(
        user_id=user_id,
        date=target_date
    ).all()
    
    total_calories = sum(log.calories for log in logs)
    total_protein = sum(log.protein_g for log in logs)
    total_carbs = sum(log.carbs_g for log in logs)
    total_fat = sum(log.fat_g for log in logs)
    
    return {
        'total_calories': total_calories,
        'total_protein': total_protein,
        'total_carbs': total_carbs,
        'total_fat': total_fat,
        'log_count': len(logs)
    }


def get_daily_progress(user_id, target_date=None, calorie_goal=None):
    """Get daily nutritional progress with comparison to goals."""
    totals = get_daily_totals(user_id, target_date)
    
    if calorie_goal is None:
        user = db.session.get(db.Model, user_id)
        if user:
            calorie_goal = getattr(user, 'daily_calorie_goal', 2000)
        else:
            calorie_goal = 2000
    
    remaining_calories = calorie_goal - totals['total_calories']
    protein_percentage = (totals['total_protein'] / calorie_goal * 100) if calorie_goal > 0 else 0
    carbs_percentage = (totals['total_carbs'] / calorie_goal * 100) if calorie_goal > 0 else 0
    fat_percentage = (totals['total_fat'] / calorie_goal * 100) if calorie_goal > 0 else 0
    
    return {
        'calories': {
            'consumed': totals['total_calories'],
            'goal': calorie_goal,
            'remaining': max(0, remaining_calories),
            'percentage': min(100, (totals['total_calories'] / calorie_goal * 100)) if calorie_goal > 0 else 0
        },
        'macros': {
            'protein': {
                'grams': totals['total_protein'],
                'calories': totals['total_protein'] * 4,
                'percentage_of_goal': protein_percentage
            },
            'carbs': {
                'grams': totals['total_carbs'],
                'calories': totals['total_carbs'] * 4,
                'percentage_of_goal': carbs_percentage
            },
            'fat': {
                'grams': totals['total_fat'],
                'calories': totals['total_fat'] * 9,
                'percentage_of_goal': fat_percentage
            }
        },
        'log_count': totals['log_count']
    }
