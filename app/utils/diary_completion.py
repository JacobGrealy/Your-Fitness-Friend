"""End-of-day diary completion (FF-0054).

Mirrors MyFitnessPal's "Complete This Entry": the user says they are done logging
and gets a five-week projection of where that day, repeated, would take them.

The projection is deliberately framed as motivational, not predictive — MFP says
the same about theirs — and it is withheld whenever it would be misleading:
nothing logged, or intake low enough that projecting weight loss would encourage
under-eating.
"""

from datetime import date, timedelta

from app.models.diary_completion import DiaryCompletion
from app.utils.bmr_calculator import calculate_bmr, calculate_tdee
from app.utils.daily_totals import get_daily_totals
from app import db

#: MFP projects five weeks ahead: 35 days of "just like today".
PROJECTION_DAYS = 35

#: The classic rough energy density of body mass, and the rule MFP-style
#: projections are built on. It is an approximation; so is the whole projection.
KCAL_PER_LB = 3500

#: Intake thresholds per gender, in kcal. At or above `fine` the projection is
#: shown plainly; between `warn` and `fine` it is shown with an under-eating
#: warning; below `warn` the warning replaces the projection.
TOO_LOW_THRESHOLDS = {
    'female': {'warn': 1000, 'fine': 1200},
    'male': {'warn': 1200, 'fine': 1500},
}

STATUS_OK = 'ok'
STATUS_UNDER_EATING = 'under_eating'
STATUS_TOO_LOW = 'too_low'
STATUS_EMPTY = 'empty'


def evaluate_intake(calories, gender):
    """Classify a day's intake against the under-eating thresholds.

    Unknown gender means there is no honest basis for a gender-specific
    threshold, so no warning is raised rather than guessing one.
    """
    thresholds = TOO_LOW_THRESHOLDS.get((gender or '').strip().lower())
    if not thresholds:
        return STATUS_OK

    if calories < thresholds['warn']:
        return STATUS_TOO_LOW
    if calories < thresholds['fine']:
        return STATUS_UNDER_EATING
    return STATUS_OK


def maintenance_calories(user):
    """The user's estimated daily maintenance (TDEE), or None without a profile.

    A silently wrong projection is worse than no projection, so anything missing
    from the profile yields None and the caller withholds the number.
    """
    if not all([user.age, user.gender, user.height, user.weight, user.activity_level]):
        return None
    bmr = calculate_bmr(user.age, user.gender, user.height, user.weight)
    return calculate_tdee(bmr, user.activity_level)


def project_weight_change(calories, tdee, days=PROJECTION_DAYS):
    """Pounds gained (positive) or lost (negative) if every day looked like today."""
    if tdee is None:
        return None
    return round((calories - tdee) * days / KCAL_PER_LB, 1)


def current_weight_lbs(user):
    """The user's profile weight in pounds, or None."""
    if not user.weight:
        return None
    return round(user.weight * 2.20462, 1)


def completed_streak(user_id, ending_on):
    """Consecutive completed days ending on `ending_on`, counting backwards."""
    completions = DiaryCompletion.query.filter_by(user_id=user_id).all()
    done = {row.date for row in completions}
    streak = 0
    cursor = ending_on
    while cursor in done:
        streak += 1
        cursor = cursor - timedelta(days=1)
    return streak


def build_completion(user, target_date):
    """Summarise `target_date` for `user` and persist the completion.

    Re-completing the same day updates the existing row: MFP explicitly allows
    carrying on logging after completing, so the record has to be overwritable
    rather than append-only.
    """
    totals = get_daily_totals(user.id, target_date)
    calories = int(totals['total_calories'] or 0)

    tdee = maintenance_calories(user)
    status = evaluate_intake(calories, user.gender)
    if totals['log_count'] == 0:
        status = STATUS_EMPTY

    change_lbs = None
    projected_weight_lbs = None
    if status in (STATUS_OK, STATUS_UNDER_EATING):
        change_lbs = project_weight_change(calories, tdee)
        start = current_weight_lbs(user)
        if change_lbs is not None and start is not None:
            projected_weight_lbs = round(start + change_lbs, 1)

    completion = DiaryCompletion.query.filter_by(user_id=user.id, date=target_date).first()
    if completion is None:
        completion = DiaryCompletion(user_id=user.id, date=target_date)
        db.session.add(completion)

    completion.calories = calories
    completion.protein_g = round(totals['total_protein'] or 0, 1)
    completion.carbs_g = round(totals['total_carbs'] or 0, 1)
    completion.fat_g = round(totals['total_fat'] or 0, 1)
    completion.change_lbs = change_lbs
    db.session.commit()

    return {
        'date': target_date.isoformat(),
        'completed': True,
        'completed_at': completion.completed_at.isoformat() if completion.completed_at else None,
        'totals': {
            'calories': calories,
            'protein_g': completion.protein_g,
            'carbs_g': completion.carbs_g,
            'fat_g': completion.fat_g,
            'log_count': totals['log_count'],
        },
        'goal_calories': user.daily_calorie_goal,
        'maintenance_calories': tdee,
        'status': status,
        'projection': {
            'days': PROJECTION_DAYS,
            'change_lbs': change_lbs,
            'projected_weight_lbs': projected_weight_lbs,
            'start_weight_lbs': current_weight_lbs(user),
        },
        'streak': completed_streak(user.id, target_date),
        'message': status_message(status, change_lbs),
    }


def status_message(status, change_lbs):
    """One sentence the UI can show as-is."""
    if status == STATUS_EMPTY:
        return 'Log something for this day first — there is nothing to project yet.'
    if status == STATUS_TOO_LOW:
        return (
            'This is under the intake most people need. No weight projection is '
            'shown for a day like this — and if this is a pattern rather than a '
            'one-off, it is worth talking to a doctor or dietitian.'
        )
    if status == STATUS_UNDER_EATING:
        return (
            'Heads up: this is on the low side for a full day. The projection '
            'below assumes every day looks like this one.'
        )
    if change_lbs is None:
        return 'Add your age, height, weight and activity level to see a projection.'
    return 'Based on this day, repeated for five weeks.'


def get_completion(user_id, target_date):
    """The stored completion for a day, or None."""
    return DiaryCompletion.query.filter_by(user_id=user_id, date=target_date).first()


def undo_completion(user_id, target_date):
    """Remove a completion. Returns True when something was removed."""
    completion = get_completion(user_id, target_date)
    if completion is None:
        return False
    db.session.delete(completion)
    db.session.commit()
    return True
