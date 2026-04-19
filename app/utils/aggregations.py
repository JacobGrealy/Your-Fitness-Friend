"""Aggregation utilities for dashboard."""
from datetime import date, timedelta
from typing import Optional, List, Dict, Any
from app.models.food_log import FoodLog
from app.models.exercise_log import ExerciseLog
from app.models.meal_photo import MealPhoto
from app.models.weight_log import WeightLog
from app import db


def get_daily_totals(user_id: int, target_date: Optional[date] = None) -> Dict[str, Any]:
    """Calculate daily nutritional totals for a user on a specific date."""
    if target_date is None:
        target_date = date.today()
    
    food_logs = FoodLog.query.filter_by(
        user_id=user_id,
        date=target_date
    ).all()
    
    meal_photos = MealPhoto.query.filter_by(
        user_id=user_id,
        date=target_date
    ).all()
    
    total_calories = sum(log.calories for log in food_logs)
    total_protein = sum(log.protein_g for log in food_logs)
    total_carbs = sum(log.carbs_g for log in food_logs)
    total_fat = sum(log.fat_g for log in food_logs)
    
    for photo in meal_photos:
        if photo.estimated_calories:
            total_calories += photo.estimated_calories
        if photo.estimated_protein:
            total_protein += photo.estimated_protein
        if photo.estimated_carbs:
            total_carbs += photo.estimated_carbs
        if photo.estimated_fat:
            total_fat += photo.estimated_fat
    
    return {
        'total_calories': total_calories,
        'total_protein': total_protein,
        'total_carbs': total_carbs,
        'total_fat': total_fat,
        'food_log_count': len(food_logs),
        'meal_photo_count': len(meal_photos)
    }


def get_exercise_totals(user_id: int, target_date: Optional[date] = None) -> Dict[str, Any]:
    """Calculate exercise totals for a user on a specific date."""
    if target_date is None:
        target_date = date.today()
    
    exercises = ExerciseLog.query.filter_by(
        user_id=user_id,
        logged_at=target_date
    ).all()
    
    total_calories = sum(ex.calories_burned or 0 for ex in exercises)
    total_duration = sum(ex.duration or 0 for ex in exercises)
    
    return {
        'total_calories': total_calories,
        'total_duration': total_duration,
        'exercise_count': len(exercises)
    }


def get_weight_trend(user_id: int, days: int = 7) -> List[Dict[str, Any]]:
    """Get weight entries for the last N days."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days-1)
    
    weights = WeightLog.query.filter(
        WeightLog.user_id == user_id,
        WeightLog.recorded_at >= start_date,
        WeightLog.recorded_at <= end_date
    ).order_by(WeightLog.recorded_at.desc()).all()
    
    return [
        {
            'date': w.recorded_at.strftime('%Y-%m-%d'),
            'weight_kg': round(w.weight, 2)
        }
        for w in weights
    ]


def calculate_macro_goals(calorie_goal: int) -> Dict[str, Any]:
    """Calculate macro goals based on calorie goal.
    
    Default split:
    - Protein: 30% of calories
    - Carbs: 40% of calories
    - Fat: 30% of calories
    """
    protein_calories = int(calorie_goal * 0.30)
    carbs_calories = int(calorie_goal * 0.40)
    fat_calories = int(calorie_goal * 0.30)
    
    return {
        'protein': {
            'calories': protein_calories,
            'grams': protein_calories // 4
        },
        'carbs': {
            'calories': carbs_calories,
            'grams': carbs_calories // 4
        },
        'fat': {
            'calories': fat_calories,
            'grams': fat_calories // 9
        }
    }


def get_daily_exercises(user_id: int, target_date: Optional[date] = None) -> List[Dict[str, Any]]:
    """Get all exercises for a specific date."""
    if target_date is None:
        target_date = date.today()
    
    exercises = ExerciseLog.query.filter_by(
        user_id=user_id,
        logged_at=target_date
    ).order_by(ExerciseLog.logged_at.desc()).all()
    
    return [
        {
            'name': ex.exercise_name,
            'duration_min': round(ex.duration, 1) if ex.duration else 0,
            'calories': round(ex.calories_burned, 1) if ex.calories_burned else 0
        }
        for ex in exercises
    ]


def get_daily_meals(user_id: int, target_date: Optional[date] = None) -> List[Dict[str, Any]]:
    """Get all meals (food logs and meal photos) for a specific date."""
    if target_date is None:
        target_date = date.today()
    
    food_logs = FoodLog.query.filter_by(
        user_id=user_id,
        date=target_date
    ).all()
    
    meal_photos = MealPhoto.query.filter_by(
        user_id=user_id,
        date=target_date
    ).all()
    
    meals = []
    
    for log in food_logs:
        meals.append({
            'meal_type': log.meal_type,
            'food_name': log.food_name,
            'calories': log.calories
        })
    
    for photo in meal_photos:
        meals.append({
            'meal_type': 'photo',
            'food_name': 'Meal photo',
            'calories': photo.estimated_calories or 0
        })
    
    return meals


def get_weekly_summary(user_id: int, week_start: Optional[date] = None) -> Dict[str, Any]:
    """Get weekly summary for a specific week."""
    if week_start is None:
        week_start = date.today() - timedelta(days=date.today().weekday())
    
    week_end = week_start + timedelta(days=6)
    
    # Get all food logs for the week
    food_logs = FoodLog.query.filter(
        FoodLog.user_id == user_id,
        FoodLog.date >= week_start,
        FoodLog.date <= week_end
    ).all()
    
    # Get all meal photos for the week
    meal_photos = MealPhoto.query.filter(
        MealPhoto.user_id == user_id,
        MealPhoto.date >= week_start,
        MealPhoto.date <= week_end
    ).all()
    
    # Get all exercises for the week
    exercises = ExerciseLog.query.filter(
        ExerciseLog.user_id == user_id,
        ExerciseLog.logged_at >= week_start,
        ExerciseLog.logged_at <= week_end
    ).all()
    
    # Get all weights for the week
    weights = WeightLog.query.filter(
        WeightLog.user_id == user_id,
        WeightLog.recorded_at >= week_start,
        WeightLog.recorded_at <= week_end
    ).all()
    
    # Calculate totals
    total_calories = sum(log.calories for log in food_logs)
    total_photo_calories = sum(photo.estimated_calories or 0 for photo in meal_photos)
    total_exercise_calories = sum(ex.calories_burned or 0 for ex in exercises)
    
    # Calculate averages
    days_with_data = len(set(
        [log.date for log in food_logs] + 
        [photo.date for photo in meal_photos]
    ))
    days_with_data = max(days_with_data, 1)
    
    avg_calories = total_calories / days_with_data
    
    # Weight statistics
    weight_stats = {}
    if weights:
        weights_sorted = sorted(weights, key=lambda w: w.recorded_at)
        first_weight = weights_sorted[0].weight
        last_weight = weights_sorted[-1].weight
        avg_weight = sum(w.weight for w in weights) / len(weights)
        
        weight_stats = {
            'average_weight': round(avg_weight, 2),
            'weight_change': round(last_weight - first_weight, 2),
            'first_weight': round(first_weight, 2),
            'last_weight': round(last_weight, 2)
        }
    
    return {
        'week_start': week_start.isoformat(),
        'week_end': week_end.isoformat(),
        'calories': {
            'total_consumed': total_calories + total_photo_calories,
            'total_burned_exercise': total_exercise_calories,
            'average_daily': round(avg_calories, 1)
        },
        'exercises': {
            'total_count': len(exercises),
            'total_calories_burned': total_exercise_calories
        },
        'weight': weight_stats
    }
