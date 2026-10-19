from datetime import date, datetime, timedelta
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
    
    # Get weight data. Recorded_at is a DateTime, so a "the log on this day" lookup needs
    # datetime bounds - comparing it to a bare date silently excluded the whole day (FF-0089).
    def weight_on(day):
        return user.weight_logs.filter(
            WeightLog.recorded_at >= datetime.combine(day, datetime.min.time()),
            WeightLog.recorded_at <= datetime.combine(day, datetime.max.time()),
        ).order_by(WeightLog.recorded_at.desc(), WeightLog.id.desc()).first()

    # Id breaks ties: the app stores weight logs at midnight, so two entries on one day share
    # a timestamp and only the id says which came second (FF-0090).
    latest_log = user.weight_logs.order_by(
        WeightLog.recorded_at.desc(), WeightLog.id.desc()
    ).first()
    earliest_log = user.weight_logs.order_by(
        WeightLog.recorded_at.asc(), WeightLog.id.asc()
    ).first()

    weight_current = latest_log.weight if latest_log else None
    weight_current_date = latest_log.recorded_at.date().isoformat() if latest_log else None
    weight_yesterday = (weight_on(target_date - timedelta(days=1)) or None)
    weight_week_ago = (weight_on(target_date - timedelta(days=7)) or None)
    weight_start = earliest_log.weight if earliest_log else None
    weight_start_date = earliest_log.recorded_at.date().isoformat() if earliest_log else None

    # Progress since the beginning, which is what the Home card leads with. Only meaningful
    # once there are two different weigh-ins: a single log is not a change (FF-0090).
    weight_change_start = None
    if (
        weight_current is not None
        and weight_start is not None
        and earliest_log is not None
        and latest_log is not None
        and earliest_log.id != latest_log.id
    ):
        weight_change_start = round(weight_current - weight_start, 2)

    weight_change_yesterday = None
    weight_change_week = None

    if weight_current is not None and weight_yesterday is not None:
        weight_change_yesterday = round(weight_current - weight_yesterday.weight, 2)

    if weight_current is not None and weight_week_ago is not None:
        weight_change_week = round(weight_current - weight_week_ago.weight, 2)
    
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
            # When the newest weigh-in happened, so the card never implies it is today's.
            'current_date': weight_current_date,
            'start': round(weight_start, 2) if weight_start else None,
            'start_date': weight_start_date,
            'change_from_start': weight_change_start,
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
