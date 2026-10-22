"""Explicit owner-scoped diary copying with transactional retry protection."""
from copy import deepcopy
from datetime import datetime, time
import hashlib
import json
from uuid import UUID

from sqlalchemy.exc import IntegrityError

from app import db
from app.models.diary_copy_operation import DiaryCopyOperation
from app.models.exercise_log import ExerciseLog
from app.models.health_log import HealthLog
from app.models.saved_exercise import SavedExercise
from app.utils.exercise_calories import session_day


class CopyError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def exercise_payload(log, destination):
    """Recover validated activity inputs, not old calculated calories or photo refs."""
    details = log.details
    payload = {'activity_id': log.activity_id, 'date': destination.isoformat(),
               'duration_minutes': log.duration, 'notes': log.notes}
    if details.get('calorie_override') is not None:
        payload['calorie_override'] = details['calorie_override']
    if log.activity_id == 'strength_training':
        from app.utils.strength_sessions import library
        known = {item['id'] for item in library(log.user_id)}
        exercises = deepcopy(details['exercises'])
        # Deleted library items remain usable as snapshots, not dangling references.
        for exercise in exercises:
            if exercise.get('exercise_id') not in known:
                exercise['exercise_id'] = None
        payload.update(exercises=exercises, effort=details.get('effort', 'moderate'))
    elif log.activity_id == 'treadmill_walking':
        payload.update(speed=details['speed_mph'], speed_unit='mph',
                       incline_percent=details['incline_percent'], arms_supported=details.get('arms_supported', False))
    elif log.activity_id in ('outdoor_walking', 'outdoor_running', 'treadmill_running', 'cycling'):
        if details.get('speed_mph') is not None:
            payload.update(speed=details['speed_mph'], speed_unit='mph')
        if log.activity_id == 'treadmill_running':
            payload['incline_percent'] = details.get('incline_percent', 0)
    elif log.activity_id == 'stationary_cycling':
        payload['effort'] = details.get('effort', 'moderate')
        if details.get('distance_miles') is not None:
            payload.update(distance=details['distance_miles'], distance_unit='mi')
        if details.get('power_watts') is not None:
            payload['power_watts'] = details['power_watts']
    elif log.activity_id == 'yoga':
        payload['yoga_style'] = details.get('yoga_style', 'general')
    return payload


def copy_entries(user, kind, data):
    if kind not in ('exercise', 'medication', 'bowel'):
        raise CopyError('Unknown diary section')
    if not isinstance(data, dict):
        raise CopyError('JSON object required')
    if data.get('confirmed') is not True:
        raise CopyError('Explicit confirmation of the destination entries is required')
    try:
        source = session_day(data.get('source_date'))
        destination = session_day(data.get('destination_date'))
    except ValueError as exc:
        raise CopyError(str(exc)) from None
    if source == destination:
        raise CopyError('Choose a destination date different from the source')
    ids = data.get('log_ids')
    if not isinstance(ids, list) or not 1 <= len(ids) <= 500 or any(isinstance(i, bool) or not isinstance(i, int) or i <= 0 for i in ids):
        raise CopyError('Select 1–500 valid log ids')
    if len(set(ids)) != len(ids):
        raise CopyError('Each source entry may be selected only once')
    request_id = data.get('request_id')
    try:
        if not isinstance(request_id, str) or str(UUID(request_id)) != request_id:
            raise ValueError
    except (ValueError, AttributeError):
        raise CopyError('A canonical UUID request_id is required for safe retries') from None
    fingerprint = hashlib.sha256(json.dumps({'kind': kind, 'source': str(source), 'destination': str(destination), 'ids': sorted(ids)}, sort_keys=True).encode()).hexdigest()

    def replay(operation):
        if operation.payload_hash != fingerprint:
            raise CopyError('This request_id was already used for a different copy', 409)
        return {**operation.result, 'replayed': True}

    cached = DiaryCopyOperation.query.filter_by(user_id=user.id, request_id=request_id).first()
    if cached:
        return replay(cached)
    model = ExerciseLog if kind == 'exercise' else HealthLog
    query = model.query.filter(model.user_id == user.id, model.id.in_(ids),
                               model.logged_at >= datetime.combine(source, time.min),
                               model.logged_at <= datetime.combine(source, time.max))
    if kind != 'exercise':
        query = query.filter(HealthLog.kind == kind)
    originals = query.order_by(model.logged_at, model.id).all()
    if len(originals) != len(ids):
        raise CopyError('One or more selected entries were not found on that source date', 404)
    clones = []
    recalculated = legacy = 0
    for original in originals:
        if kind != 'exercise':
            clones.append(HealthLog(user_id=user.id, kind=kind, logged_at=datetime.combine(destination, original.logged_at.time()),
                                    dose_mg=original.dose_mg, notes=original.notes))
        elif original.activity_id and original.details:
            from app.routes.exercise import _typed_values
            try:
                fields = _typed_values(exercise_payload(original, destination), user)
            except (ValueError, KeyError, TypeError) as exc:
                raise CopyError(f'Exercise inputs cannot be copied: {exc}') from None
            clones.append(ExerciseLog(user_id=user.id, **fields))
            if fields['details'].get('active_calories') is not None:
                recalculated += 1
        else:
            saved = SavedExercise.query.filter_by(id=original.saved_exercise_id, user_id=user.id).first() if original.saved_exercise_id else None
            clones.append(ExerciseLog(user_id=user.id, exercise_name=original.exercise_name,
                saved_exercise_id=saved.id if saved else None, duration=original.duration,
                calories_burned=original.calories_burned, intensity=original.intensity,
                notes=original.notes, logged_at=datetime.combine(destination, time.min)))
            legacy += 1
    try:
        db.session.add_all(clones)
        db.session.flush()
        result = {'created_count': len(clones), 'created_ids': [log.id for log in clones],
                  'kind': kind, 'source_date': source.isoformat(), 'destination_date': destination.isoformat(),
                  'photos_copied': False, 'recalculated_exercises': recalculated,
                  'legacy_estimates_preserved': legacy,
                  'warnings': ['Legacy exercise estimates were preserved because their original calculation inputs are unavailable.'] if legacy else []}
        db.session.add(DiaryCopyOperation(user_id=user.id, request_id=request_id, payload_hash=fingerprint, result=result))
        db.session.commit()
        return {**result, 'replayed': False}
    except IntegrityError:
        db.session.rollback()
        winner = DiaryCopyOperation.query.filter_by(user_id=user.id, request_id=request_id).first()
        if winner:
            return replay(winner)
        raise
    except Exception:
        db.session.rollback()
        raise
