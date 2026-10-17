"""Nutrition service for calculating BMR, TDEE, and calorie goals."""

from app import db
from app.models.weight_log import WeightLog
from app.utils.bmr_calculator import calculate_bmr, calculate_tdee


WEEKLY_GOAL_ADJUSTMENTS = {
    'maintain': 0,
    'lose_0_5': -250,
    'lose_1': -500,
    'lose_1_5': -750,
    'lose_2': -1000,
}

MIN_CALORIES = 1200


def calculate_calorie_goal(age, gender, height_cm, weight_kg, activity_level, weekly_goal='maintain'):
    """Calculate BMR, TDEE, and daily calorie goal.

    Args:
        age: Age in years
        gender: 'male' or 'female'
        height_cm: Height in centimeters
        weight_kg: Weight in kilograms
        activity_level: Activity level string
        weekly_goal: Weekly goal type

    Returns:
        dict: {bmr, tdee, calorie_goal} or None if insufficient data
    """
    if age is None or gender is None or height_cm is None or weight_kg is None or activity_level is None:
        return None

    bmr = calculate_bmr(age, gender, height_cm, weight_kg)
    tdee = calculate_tdee(bmr, activity_level)
    adjustment = WEEKLY_GOAL_ADJUSTMENTS.get(weekly_goal, 0)
    calorie_goal = tdee + adjustment

    # Round to nearest 50
    calorie_goal = round(calorie_goal / 50) * 50

    # Enforce minimum calories
    calorie_goal = max(calorie_goal, MIN_CALORIES)

    return {
        'bmr': bmr,
        'tdee': tdee,
        'calorie_goal': calorie_goal,
    }


def recalculate_user_calories(user, weekly_goal='maintain'):
    """Recalculate and update a user's calorie goal.

    Args:
        user: User model instance
        weekly_goal: Weekly goal type

    Returns:
        dict: {bmr, tdee, calorie_goal} or None if insufficient data
    """
    result = calculate_calorie_goal(
        age=user.age,
        gender=user.gender,
        height_cm=user.height,
        weight_kg=user.weight,
        activity_level=user.activity_level,
        weekly_goal=weekly_goal,
    )

    if result:
        # A goal the user set by hand survives every recalculation: BMR/TDEE are
        # still returned (they describe the body), but the target is theirs.
        if not getattr(user, 'calorie_goal_manual', False):
            user.daily_calorie_goal = result['calorie_goal']
            db.session.add(user)
            db.session.commit()

    return result


def recalculate_from_weight_log(user, weekly_goal='maintain'):
    """Recalculate calorie goal using the latest weight log entry.

    Uses the most recent weight log entry's weight instead of the user's stored weight.

    Args:
        user: User model instance
        weekly_goal: Weekly goal type

    Returns:
        dict: {bmr, tdee, calorie_goal} or None if insufficient data
    """
    # Get the latest weight log entry by date
    latest_log = WeightLog.query.filter_by(
        user_id=user.id
    ).order_by(WeightLog.recorded_at.desc()).first()

    if latest_log:
        weight_kg = latest_log.weight * 0.453592  # Convert lbs to kg
    else:
        weight_kg = user.weight

    return calculate_calorie_goal(
        age=user.age,
        gender=user.gender,
        height_cm=user.height,
        weight_kg=weight_kg,
        activity_level=user.activity_level,
        weekly_goal=weekly_goal,
    )
