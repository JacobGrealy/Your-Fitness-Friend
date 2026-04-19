from datetime import date, timedelta
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app.models.weight_log import WeightLog
from app.utils.aggregations import (
    get_daily_totals,
    get_exercise_totals,
    get_weight_trend,
    calculate_macro_goals,
    get_daily_exercises,
    get_daily_meals,
    get_weekly_summary
)
from app.utils.weight_calculator import get_weight_statistics

bp = Blueprint('dashboard', __name__)


@bp.route('/daily', methods=['GET'])
@login_required
def daily():
    """Get daily dashboard data."""
    date_param = request.args.get('date')
    
    if date_param:
        try:
            target_date = date.fromisoformat(date_param)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD.'}), 400
    else:
        target_date = date.today()
    
    user = current_user
    
    # Get daily totals
    daily_totals = get_daily_totals(user.id, target_date)
    
    # Get exercise totals
    exercise_totals = get_exercise_totals(user.id, target_date)
    
    # Get macro goals
    macro_goals = calculate_macro_goals(user.daily_calorie_goal)
    
    # Get weight data
    weight_logs = user.weight_logs.order_by(
        WeightLog.recorded_at.desc()
    ).limit(8).all()
    
    weight_current = None
    weight_yesterday = None
    weight_week_ago = None
    
    if weight_logs:
        weight_current = weight_logs[0].weight
        
        for log in weight_logs:
            if log.recorded_at.date() == target_date - timedelta(days=1):
                weight_yesterday = log.weight
                break
        
        for log in weight_logs:
            if log.recorded_at.date() == target_date - timedelta(days=7):
                weight_week_ago = log.weight
                break
    
    # Calculate weight changes
    weight_change_yesterday = None
    weight_change_week = None
    
    if weight_current is not None and weight_yesterday is not None:
        weight_change_yesterday = round(weight_current - weight_yesterday, 2)
    
    if weight_current is not None and weight_week_ago is not None:
        weight_change_week = round(weight_current - weight_week_ago, 2)
    
    # Get exercises for the day
    exercises = get_daily_exercises(user.id, target_date)
    
    # Get meals for the day
    meals = get_daily_meals(user.id, target_date)
    
    # Build response
    response = {
        'date': target_date.isoformat(),
        'calories': {
            'consumed': daily_totals['total_calories'],
            'goal': user.daily_calorie_goal,
            'remaining': user.daily_calorie_goal - daily_totals['total_calories'],
            'burned_exercise': exercise_totals['total_calories']
        },
        'macros': {
            'protein': {
                'consumed': round(daily_totals['total_protein'], 1),
                'goal': macro_goals['protein']['grams']
            },
            'carbs': {
                'consumed': round(daily_totals['total_carbs'], 1),
                'goal': macro_goals['carbs']['grams']
            },
            'fat': {
                'consumed': round(daily_totals['total_fat'], 1),
                'goal': macro_goals['fat']['grams']
            }
        },
        'weight': {
            'current': round(weight_current, 2) if weight_current else None,
            'change_from_yesterday': weight_change_yesterday,
            'change_from_week_ago': weight_change_week
        },
        'exercises': exercises,
        'meals': meals
    }
    
    return jsonify(response)


@bp.route('/weight-trend', methods=['GET'])
@login_required
def weight_trend():
    """Get weight trend for the last N days."""
    days_param = request.args.get('days', default=7, type=int)
    
    if days_param < 1 or days_param > 365:
        return jsonify({'error': 'Days must be between 1 and 365'}), 400
    
    trend = get_weight_trend(current_user.id, days_param)
    
    return jsonify(trend)


@bp.route('/weekly-summary', methods=['GET'])
@login_required
def weekly_summary():
    """Get weekly summary."""
    week_start_param = request.args.get('week_start')
    
    if week_start_param:
        try:
            week_start = date.fromisoformat(week_start_param)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD.'}), 400
    else:
        week_start = date.today() - timedelta(days=date.today().weekday())
    
    summary = get_weekly_summary(current_user.id, week_start)
    
    return jsonify(summary)
