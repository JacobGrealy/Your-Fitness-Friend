"""Structured strength workouts; load/reps are recorded, never used to invent calories.

2024 Adult Compendium Conditioning Exercise: 02054, multiple exercises 8–15 reps,
3.5 MET; 02050 vigorous lifting, 6.0 MET. https://pacompendium.com/conditioning-exercise/
"""
from app.models.saved_exercise import SavedExercise
from app.utils.exercise_calories import number, weight_snapshot

STRENGTH_LIBRARY = [
    {'id': 'builtin:bench_press', 'name': 'Bench Press', 'equipment': 'barbell'},
    {'id': 'builtin:squat', 'name': 'Squat', 'equipment': 'barbell'},
    {'id': 'builtin:deadlift', 'name': 'Deadlift', 'equipment': 'barbell'},
    {'id': 'builtin:overhead_press', 'name': 'Overhead Press', 'equipment': 'barbell'},
    {'id': 'builtin:barbell_row', 'name': 'Barbell Row', 'equipment': 'barbell'},
    {'id': 'builtin:dumbbell_press', 'name': 'Dumbbell Press', 'equipment': 'dumbbell'},
    {'id': 'builtin:dumbbell_row', 'name': 'Dumbbell Row', 'equipment': 'dumbbell'},
    {'id': 'builtin:biceps_curl', 'name': 'Biceps Curl', 'equipment': 'dumbbell'},
    {'id': 'builtin:lateral_raise', 'name': 'Lateral Raise', 'equipment': 'dumbbell'},
    {'id': 'builtin:lat_pulldown', 'name': 'Lat Pulldown', 'equipment': 'machine'},
    {'id': 'builtin:leg_press', 'name': 'Leg Press', 'equipment': 'machine'},
    {'id': 'builtin:push_up', 'name': 'Push-up', 'equipment': 'bodyweight'},
    {'id': 'builtin:pull_up', 'name': 'Pull-up', 'equipment': 'bodyweight'},
    {'id': 'builtin:lunge', 'name': 'Bodyweight Lunge', 'equipment': 'bodyweight'},
    {'id': 'builtin:crunch', 'name': 'Crunch', 'equipment': 'bodyweight'},
]
EQUIPMENT = ('barbell', 'dumbbell', 'machine', 'bodyweight', 'other')


def library(user_id):
    saved = SavedExercise.query.filter_by(user_id=user_id).order_by(SavedExercise.name).all()
    return [dict(item) for item in STRENGTH_LIBRARY] + [
        {'id': f'saved:{item.id}', 'name': item.name, 'equipment': 'other'}
        for item in saved if item.type in (None, 'strength', 'other')
    ]


def normalize_exercises(raw, user_id):
    if not isinstance(raw, list) or not 1 <= len(raw) <= 50:
        raise ValueError('Provide 1–50 exercises in the workout')
    choices = {item['id']: item for item in library(user_id)}
    normalized = []
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError('Each exercise must be an object')
        exercise_id = item.get('exercise_id')
        if exercise_id is not None:
            if not isinstance(exercise_id, str) or exercise_id not in choices:
                raise ValueError('Exercise not found in your strength library')
            exercise = choices[exercise_id]
            name = exercise['name']
            equipment = item.get('equipment', exercise['equipment'])
            if exercise_id.startswith('builtin:') and equipment != exercise['equipment']:
                raise ValueError('Built-in exercise equipment cannot be changed')
        else:
            name = item.get('name')
            equipment = item.get('equipment', 'other')
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100:
            raise ValueError('Exercise name must be 1–100 characters')
        if equipment not in EQUIPMENT:
            raise ValueError('Invalid exercise equipment')
        sets = item.get('sets')
        if not isinstance(sets, list) or not 1 <= len(sets) <= 100:
            raise ValueError('Provide 1–100 sets for each exercise')
        clean_sets = []
        for row in sets:
            if not isinstance(row, dict):
                raise ValueError('Each set must be an object')
            reps = number(row.get('reps'), 'Repetitions', 1, 10000)
            if not reps.is_integer():
                raise ValueError('Repetitions must be a whole number')
            weight = row.get('weight_lbs')
            if equipment == 'bodyweight':
                if weight is not None:
                    raise ValueError('Bodyweight sets do not have an external load')
            else:
                weight = number(weight, 'External load (lb)', 0, 5000)
            clean_sets.append({'reps': int(reps), 'weight_lbs': weight})
        normalized.append({
            'exercise_id': exercise_id, 'name': name.strip(), 'equipment': equipment,
            'load_convention': 'per_hand' if equipment == 'dumbbell' else 'including_bar' if equipment == 'barbell' else 'bodyweight' if equipment == 'bodyweight' else 'external_load',
            'sets': clean_sets,
        })
    return normalized


def strength_estimate(data, user, day, existing=None):
    exercises = normalize_exercises(data.get('exercises'), user.id)
    duration = None if data.get('duration_minutes') is None else number(data['duration_minutes'], 'Duration (minutes)', 0.1, 1440)
    effort = data.get('effort', 'moderate')
    if effort not in ('moderate', 'vigorous'):
        raise ValueError('Effort must be moderate or vigorous')
    override = None if data.get('calorie_override') is None else number(data['calorie_override'], 'Active calorie override', 0, 20000)
    weight = {'weight_lbs': None, 'weight_kg': None, 'weight_source': None, 'weight_date': None}
    active = gross = met = None
    method = 'not_estimated_v1'
    code = '02054' if effort == 'moderate' else '02050'
    if duration is not None:
        if existing and existing.logged_at.date() == day and existing.details and existing.details.get('weight_kg'):
            weight = {key: existing.details[key] for key in weight}
        else:
            weight = weight_snapshot(user, day)
        met = 3.5 if effort == 'moderate' else 6.0
        gross = met * 0.0175 * weight['weight_kg'] * duration
        active = (met - 1) * 0.0175 * weight['weight_kg'] * duration
        method = 'compendium_strength_2024_v1'
    elif override is not None:
        method = 'manual_active_v1'
    return {
        'activity_id': 'strength_training', 'tracking_format': 'strength',
        'exercises': exercises, 'duration_minutes': duration, 'effort': effort,
        'met': met, 'method': method, 'source': f'https://pacompendium.com/conditioning-exercise/#{code}' if met else None,
        'active_calories': active, 'gross_calories': gross,
        'calorie_override': override, 'calories_burned': active if override is None else override,
        'calorie_basis': 'active', **weight,
        'warnings': ['Strength calorie estimates use whole-session duration and effort, including normal rest periods—not individual reps or load.'] if duration else ['Add session duration to estimate calories; sets and reps alone do not determine energy expenditure.'],
    }
