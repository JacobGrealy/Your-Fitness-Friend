"""Typed cardio/mobility estimates from ACSM and the 2024 Adult Compendium.

Sources: https://pacompendium.com/walking/, /running/, /bicycling/,
/conditioning-exercise/. Bands intentionally use the lower published band in gaps.
"""
from app.utils.exercise_calories import number, weight_snapshot

ACTIVITIES = {
    'outdoor_walking': {'name': 'Outdoor Walking', 'category': 'cardio', 'tracking_format': 'distance'},
    'outdoor_running': {'name': 'Outdoor Running', 'category': 'cardio', 'tracking_format': 'distance'},
    'treadmill_running': {'name': 'Treadmill Running', 'category': 'cardio', 'tracking_format': 'running_treadmill'},
    'cycling': {'name': 'Cycling', 'category': 'cardio', 'tracking_format': 'cycling'},
    'stationary_cycling': {'name': 'Stationary Bike', 'category': 'cardio', 'tracking_format': 'stationary_cycling'},
    'stretching': {'name': 'Stretching', 'category': 'mobility', 'tracking_format': 'mobility'},
    'yoga': {'name': 'Yoga', 'category': 'mobility', 'tracking_format': 'mobility'},
}


def motion(data, duration, minimum, maximum, required=True):
    modes = [key for key in ('distance', 'speed', 'pace') if data.get(key) is not None]
    if not modes and not required:
        return None, None
    if len(modes) != 1:
        raise ValueError('Provide exactly one of distance, speed or pace')
    mode = modes[0]
    value = number(data[mode], mode.capitalize(), 0.001, 10000)
    if mode == 'distance':
        unit = data.get('distance_unit', 'mi')
        if unit not in ('mi', 'km'):
            raise ValueError('distance_unit must be mi or km')
        miles = value if unit == 'mi' else value / 1.609344
        mph = miles * 60 / duration
    elif mode == 'speed':
        unit = data.get('speed_unit', 'mph')
        if unit not in ('mph', 'km/h'):
            raise ValueError('speed_unit must be mph or km/h')
        mph = value if unit == 'mph' else value / 1.609344
        miles = mph * duration / 60
    else:
        unit = data.get('pace_unit', 'min/mile')
        if unit not in ('min/mile', 'min/km'):
            raise ValueError('pace_unit must be min/mile or min/km')
        mph = 60 / value / (1.609344 if unit == 'min/km' else 1)
        miles = mph * duration / 60
    return number(mph, 'Speed (mph)', minimum, maximum), miles


def lower_band(value, bands):
    return next((met, code) for boundary, met, code in reversed(bands) if value >= boundary)


def activity_estimate(data, user, day, existing=None):
    activity = data['activity_id']
    metadata = ACTIVITIES[activity]
    duration = number(data.get('duration_minutes'), 'Duration (minutes)', 0.1, 1440)
    warnings = ['Estimated active calories; individual efficiency and conditions affect accuracy.']
    mph = miles = incline = power = yoga_style = None
    effort = data.get('effort', 'moderate')
    if effort not in ('light', 'moderate', 'vigorous'):
        raise ValueError('Effort must be light, moderate or vigorous')
    if data.get('resistance') is not None:
        raise ValueError('Resistance levels do not determine calories; use measured watts or effort')
    if data.get('arms_supported'):
        raise ValueError('Arms-supported adjustment applies only to treadmill walking')
    if data.get('power_watts') is not None and activity != 'stationary_cycling':
        raise ValueError('Power input is supported for stationary cycling only')
    if data.get('incline_percent') is not None and activity != 'treadmill_running':
        raise ValueError('Incline input is supported for treadmill activities only')
    if activity in ('outdoor_walking', 'outdoor_running', 'treadmill_running', 'cycling'):
        mph, miles = motion(data, duration, 0.1 if activity in ('outdoor_walking', 'cycling') else 2.6,
                            5.5 if activity == 'outdoor_walking' else 40 if activity == 'cycling' else 15,
                            required=activity != 'cycling')
    elif activity == 'stationary_cycling':
        if data.get('speed') is not None or data.get('pace') is not None:
            raise ValueError('Stationary bike speed does not determine energy use; use watts or effort')
        if data.get('distance') is not None:
            _, miles = motion(data, duration, 0.1, 100)
    elif any(data.get(key) is not None for key in ('distance', 'speed', 'pace')):
        raise ValueError('This activity uses duration, not distance or pace')
    source_section = 'conditioning-exercise'
    method = 'compendium_activity_2024_v1'
    if activity == 'outdoor_walking':
        met, code = lower_band(mph, [(0, 2.3, '17151'), (2, 2.8, '17152'), (2.5, 3, '17170'), (2.8, 3.8, '17190'), (3.5, 4.8, '17200'), (4, 5.5, '17220'), (4.5, 7, '17230'), (5, 8.5, '17231')])
        source_section = 'walking'
        warnings.append('Assumes level, firm ground; hills, terrain and carried loads are not modeled.')
    elif activity == 'outdoor_running':
        met, code = lower_band(mph, [(0, 3.3, '12026'), (4, 6.5, '12028'), (4.3, 7.8, '12029'), (5, 8.5, '12030'), (5.5, 9, '12045'), (6, 9.3, '12050'), (6.7, 10.5, '12060'), (7, 11, '12070'), (7.5, 11.8, '12080'), (8, 12, '12090'), (8.6, 12.5, '12100'), (9, 13, '12110'), (9.3, 14.8, '12115'), (11, 16.8, '12130'), (12, 18.5, '12132'), (13, 19.8, '12134'), (14, 23, '12135')])
        source_section = 'running'
        warnings.append('Assumes level running; uses lower published speed band between reference values.')
    elif activity == 'treadmill_running':
        incline = number(data.get('incline_percent', 0), 'Incline (%)', 0, 20)
        speed_m_min = mph * 26.8224
        met = (0.2 * speed_m_min + 0.9 * speed_m_min * incline / 100 + 3.5) / 3.5
        method = 'acsm_running_v1'
        code = None
        if speed_m_min < 134:
            warnings.append('ACSM running equation extrapolated below its usual running speed range; consider treadmill walking if using a walking gait.')
    elif activity == 'cycling':
        source_section = 'bicycling'
        met, code = lower_band(mph, [(0, 4, '01010'), (10, 6.8, '01020'), (12, 8, '01030'), (14, 10, '01040'), (16, 12, '01050'), (20, 16.8, '01060')]) if mph is not None else (7, '01014')
        warnings.append('Outdoor cycling speed-band estimate; wind, hills, drafting and bike type can substantially change energy cost.')
    elif activity == 'stationary_cycling':
        source_section = 'bicycling'
        if data.get('power_watts') is not None:
            power = number(data['power_watts'], 'Measured power (watts)', 25, 500)
            met, code = lower_band(power, [(25, 3.5, '01210'), (50, 4, '01214'), (60, 5, '01216'), (70, 5.8, '01218'), (90, 6, '01220'), (101, 6.8, '01224'), (126, 8, '01228'), (151, 10.3, '01232'), (200, 10.8, '01236'), (230, 12.5, '01240'), (270, 13.8, '01244'), (325, 16.3, '01248')])
            warnings.append('Measured-watts MET band; gaps use the lower reference band. Resistance numbers are not watts.')
        else:
            met, code = {'light': (3.5, '01210'), 'moderate': (6.8, '01200'), 'vigorous': (10.8, '01236')}[effort]
            warnings.append('Effort-only bike estimate without measured power is less precise; distance is recorded but not used to infer energy.')
    elif activity == 'stretching':
        met, code = 2.3, '02101'
    else:
        yoga_style = data.get('yoga_style', 'general')
        styles = {'general': (2.3, '02175'), 'hatha': (2.3, '02150'), 'vinyasa': (2.7, '02185'), 'power': (4, '02160')}
        if not isinstance(yoga_style, str) or yoga_style not in styles:
            raise ValueError('Yoga style must be general, hatha, vinyasa or power')
        met, code = styles[yoga_style]
    if existing and existing.logged_at.date() == day and existing.details and existing.details.get('weight_kg'):
        weight = {key: existing.details[key] for key in ('weight_lbs', 'weight_kg', 'weight_source', 'weight_date')}
    else:
        weight = weight_snapshot(user, day)
    gross = met * 0.0175 * weight['weight_kg'] * duration
    active = max(0, (met - 1) * 0.0175 * weight['weight_kg'] * duration)
    override = None if data.get('calorie_override') is None else number(data['calorie_override'], 'Active calorie override', 0, 20000)
    return {
        'activity_id': activity, 'tracking_format': metadata['tracking_format'], 'duration_minutes': duration,
        'speed_mph': mph, 'distance_miles': miles, 'distance_km': miles * 1.609344 if miles is not None else None,
        'incline_percent': incline, 'power_watts': power, 'effort': effort, 'yoga_style': yoga_style,
        'met': met, 'method': method, 'source': 'ACSM running metabolic equation' if code is None else f'https://pacompendium.com/{source_section}/#{code}',
        'active_calories': active, 'gross_calories': gross, 'calories_burned': active if override is None else override,
        'calorie_override': override, 'calorie_basis': 'active', **weight, 'warnings': warnings,
    }
