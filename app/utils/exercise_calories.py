"""Versioned, deterministic exercise estimates. No model/network calls.

ACSM walking VO2 = 0.1*s + 1.8*s*grade + 3.5 (s in m/min).
Per owner direction (FF-0114), use this equation throughout the accepted walking
speed range. Outside the usual 50–100 m/min range, disclose extrapolation rather
than blocking a walking-pad session. Grade is a fraction, not percent or degrees.
"""
from datetime import date, datetime, time
import math

from app.models.weight_log import WeightLog

CATALOG = [{
    'id': 'treadmill_walking', 'name': 'Walking Pad / Treadmill',
    'category': 'cardio', 'tracking_format': 'treadmill',
}]


def number(value, name, minimum, maximum):
    if isinstance(value, bool):
        raise ValueError(f'{name} must be a number')
    try:
        result = float(value)
    except (TypeError, ValueError):
        raise ValueError(f'{name} must be a number') from None
    if not math.isfinite(result) or not minimum <= result <= maximum:
        raise ValueError(f'{name} must be between {minimum} and {maximum}')
    return result


def session_day(value):
    if not isinstance(value, str):
        raise ValueError('date must be YYYY-MM-DD')
    try:
        result = date.fromisoformat(value)
    except ValueError:
        raise ValueError('date must be YYYY-MM-DD') from None
    if result.isoformat() != value:
        raise ValueError('date must be YYYY-MM-DD')
    return result


def weight_snapshot(user, day):
    log = WeightLog.query.filter(
        WeightLog.user_id == user.id,
        WeightLog.recorded_at <= datetime.combine(day, time.max),
    ).order_by(WeightLog.recorded_at.desc(), WeightLog.id.desc()).first()
    lbs = log.weight if log else user.weight
    lbs = number(lbs, 'Body weight (lb)', 1, 2000)
    return {
        'weight_lbs': lbs, 'weight_kg': lbs * 0.45359237,
        'weight_source': 'weigh_in' if log else 'profile',
        'weight_date': log.recorded_at.date().isoformat() if log else None,
    }


def treadmill_estimate(data, weight):
    """Normalize explicit units, return immutable calculation inputs and results."""
    duration = number(data.get('duration_minutes'), 'Duration (minutes)', 0.1, 1440)
    has_speed = data.get('speed') is not None
    has_pace = data.get('pace') is not None
    if has_speed == has_pace:
        raise ValueError('Provide exactly one of speed or pace')
    if has_speed:
        unit = data.get('speed_unit', 'mph')
        if unit not in ('mph', 'km/h'):
            raise ValueError('speed_unit must be mph or km/h')
        speed = number(data['speed'], 'Speed', 0.01, 100)
        mph = speed if unit == 'mph' else speed / 1.609344
    else:
        unit = data.get('pace_unit', 'min/mile')
        if unit not in ('min/mile', 'min/km'):
            raise ValueError('pace_unit must be min/mile or min/km')
        pace = number(data['pace'], 'Pace', 0.1, 600)
        mph = 60 / pace / (1.609344 if unit == 'min/km' else 1)
    mph = number(mph, 'Walking speed (mph)', 0.1, 5.5)
    incline = number(data.get('incline_percent', 0), 'Incline (%)', 0, 20)
    speed_m_min = mph * 26.8224
    warnings = ['Estimated energy use; handrail support and individual efficiency affect accuracy.']
    vo2 = 0.1 * speed_m_min + 1.8 * speed_m_min * incline / 100 + 3.5
    met = vo2 / 3.5
    method = 'acsm_walking_v2'
    source = 'ACSM walking metabolic equation'
    if not 50 <= speed_m_min <= 100:
        warnings.append('ACSM walking equation extrapolated outside its usual 50–100 m/min speed range (about 1.87–3.73 mph); accuracy is less certain.')
    gross = vo2 * weight['weight_kg'] / 1000 * 5 * duration
    active = max(0, (vo2 - 3.5) * weight['weight_kg'] / 1000 * 5 * duration)
    override = None if data.get('calorie_override') is None else number(data['calorie_override'], 'Active calorie override', 0, 20000)
    return {
        'activity_id': 'treadmill_walking', 'tracking_format': 'treadmill',
        'duration_minutes': duration, 'speed_mph': mph, 'incline_percent': incline,
        'distance_miles': mph * duration / 60, 'distance_km': mph * duration / 60 * 1.609344,
        'calorie_override': override, 'met': met, 'method': method, 'source': source, 'warnings': warnings,
        'active_calories': active, 'gross_calories': gross,
        'calories_burned': active if override is None else override, 'calorie_basis': 'active', **weight,
    }
