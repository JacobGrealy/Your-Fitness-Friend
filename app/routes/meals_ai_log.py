from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from app.models.food_log import FoodLog
from app.utils.qwen_client import qwen_client
import os
import base64
import uuid
import json
import re

bp = Blueprint('meals_ai_log', __name__)

UPLOAD_FOLDER = 'ai_food_logs'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
VALID_MEAL_TYPES = {'breakfast', 'lunch', 'dinner', 'snack'}


def allowed_file(filename):
    if not filename or '.' not in filename:
        return False
    return filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_uploaded_file(file):
    if not allowed_file(file.filename):
        return None, "Invalid file type. Only JPG and PNG are allowed."
    if file.content_length and file.content_length > 16 * 1024 * 1024:
        return None, "File too large. Maximum size is 16MB."
    extension = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{extension}"
    upload_path = os.path.join(current_app.root_path, 'uploads', UPLOAD_FOLDER)
    os.makedirs(upload_path, exist_ok=True)
    filepath = os.path.join(upload_path, unique_filename)
    try:
        file.save(filepath)
        return f"{UPLOAD_FOLDER}/{unique_filename}", None
    except Exception as e:
        return None, f"Error saving file: {str(e)}"


def encode_file_to_base64(filepath):
    with open(filepath, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def parse_ai_nutrition(content):
    """Parse JSON nutrition data from AI response."""
    # Strip markdown code blocks if present
    if content.strip().startswith('```'):
        content = re.search(r'\{.*\}', content, re.DOTALL).group() if re.search(r'\{.*\}', content, re.DOTALL) else content.strip()
    
    try:
        result = json.loads(content.strip())
        if all(k in result for k in ('calories', 'protein', 'carbs', 'fat')):
            return {
                'calories': int(float(result['calories'])),
                'protein': float(result['protein']),
                'carbs': float(result['carbs']),
                'fat': float(result['fat']),
            }
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        pass
    match = re.search(r'\{[^{}]*"calories"[^{}]*"protein"[^{}]*"carbs"[^{}]*"fat"[^{}]*\}', content, re.DOTALL)
    if match:
        try:
            result = json.loads(match.group())
            if all(k in result for k in ('calories', 'protein', 'carbs', 'fat')):
                return {
                    'calories': int(float(result['calories'])),
                    'protein': float(result['protein']),
                    'carbs': float(result['carbs']),
                    'fat': float(result['fat']),
                }
        except (json.JSONDecodeError, KeyError, TypeError, ValueError):
            pass
    return None


def create_food_log(user_id, food_name, calories, protein_g, carbs_g, fat_g, meal_type):
    today = db.func.date(db.func.now())
    food_log = FoodLog(
        user_id=user_id,
        food_name=food_name,
        calories=calories,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g,
        date=today,
        meal_type=meal_type,
    )
    db.session.add(food_log)
    db.session.flush()
    return food_log


def format_log_entry(food_log):
    return {
        'id': food_log.id,
        'food_name': food_log.food_name,
        'calories': food_log.calories,
        'protein_g': food_log.protein_g,
        'carbs_g': food_log.carbs_g,
        'fat_g': food_log.fat_g,
        'meal_type': food_log.meal_type,
    }


@bp.route('/ai-log', methods=['POST'])
@login_required
def ai_log():
    """
    Log food via photo with AI analysis.

    Initial request (first photo):
        - photo: Image file (multipart)
        - meal_type: breakfast|lunch|dinner|snack
        - conversation_history: []

    Follow-up request (conversation):
        - conversation_history: [{role: 'user'|'ai', content: string}]
        - user_message: string (the latest user message)

    Returns:
        { logs: [...], conversation_history: [...], error?: string }
    """
    # Handle initial photo upload
    if 'photo' in request.files:
        file = request.files['photo']
        if not file.filename or file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        photo_path, error = save_uploaded_file(file)
        if error:
            return jsonify({'error': error}), 400

        full_path = os.path.join(current_app.root_path, 'uploads', photo_path)
        image_base64 = encode_file_to_base64(full_path)

        meal_type = request.form.get('meal_type', 'lunch')
        if meal_type not in VALID_MEAL_TYPES:
            meal_type = 'lunch'

        try:
            analysis = qwen_client.analyze_meal_photo(image_base64)
            analysis_data = {
                'calories': int(analysis['calories']),
                'protein_g': float(analysis['protein']),
                'carbs_g': float(analysis['carbs']),
                'fat_g': float(analysis['fat']),
            }
            food_name = ', '.join(analysis.get('items', ['Analyzed meal']))[:120]
        except Exception:
            current_app.logger.exception("AI meal analysis failed for photo upload")
            analysis_data = None
            food_name = 'Analyzed meal'

        if analysis_data:
            food_log = create_food_log(
                user_id=current_user.id,
                food_name=food_name,
                **analysis_data,
                meal_type=meal_type,
            )
            db.session.commit()
            logs = [format_log_entry(food_log)]
        else:
            logs = []

        conversation_history = [{
            'role': 'ai',
            'content': f"Analyzed your {meal_type}. Estimated: {analysis_data['calories']} calories, {analysis_data['protein_g']}g protein, {analysis_data['carbs_g']}g carbs, {analysis_data['fat_g']}g fat." if analysis_data else "Could not analyze the photo. Please try again."
        }]

        return jsonify({
            'logs': logs,
            'conversation_history': conversation_history,
            'photo_path': photo_path,
        }), 200

    # Handle follow-up conversation
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request'}), 400

    conversation_history = list(data.get('conversation_history', []))
    user_message = data.get('user_message', '').strip()

    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    # Build the prompt with conversation history
    system_prompt = (
        "You are a nutritionist. The user previously uploaded a photo of a meal that was analyzed. "
        "They are now asking about food modifications to that meal. "
        "Respond with ONLY valid JSON containing the NEW or MODIFIED food items from their request. "
        "Format: {\"items\": [{\"food_name\": \"item name\", \"calories\": number, \"protein\": number, \"carbs\": number, \"fat\": number}]}. "
        "If they want to add something, include only the added items. "
        "If they want to modify something, include the full item with updated values. "
        "If they want to remove something, include the removed item with negative values."
    )

    # Build messages for the API
    messages = [
        {"role": "system", "content": system_prompt},
    ]
    # Add conversation history
    for msg in conversation_history:
        messages.append({"role": msg['role'], "content": msg['content']})
    # Add the latest user message
    messages.append({"role": "user", "content": user_message})

    try:
        ai_content = qwen_client.chat(messages)

        # Parse the AI response
        parsed = parse_ai_nutrition(ai_content)

        logs = []
        if parsed:
            # Single-item JSON response (calories, protein, carbs, fat)
            food_log = create_food_log(
                user_id=current_user.id,
                food_name='Additional item',
                **parsed,
                meal_type='snack',
            )
            db.session.commit()
            logs.append(format_log_entry(food_log))
        else:
            # Try extracting multiple items from JSON
            match = re.search(r'\{[^{}]*"items"[^{}]*\}', ai_content, re.DOTALL)
            if match:
                try:
                    result = json.loads(match.group())
                    items = result.get('items', [])
                except json.JSONDecodeError:
                    items = []

                if items:
                    for item in items:
                        cal = int(float(item.get('calories', 0)))
                        if cal != 0:  # Skip items with 0 calories (likely not food)
                            food_log = create_food_log(
                                user_id=current_user.id,
                                food_name=item.get('food_name', item.get('name', 'Additional item'))[:120],
                                calories=cal,
                                protein_g=float(item.get('protein', 0)),
                                carbs_g=float(item.get('carbs', 0)),
                                fat_g=float(item.get('fat', 0)),
                                meal_type='snack',
                            )
                            logs.append(format_log_entry(food_log))
                    db.session.commit()
                else:
                    db.session.rollback()

        # Build response
        conversation_history.append({'role': 'user', 'content': user_message})

        # Generate a user-friendly AI response
        ai_message = {
            'role': 'ai',
            'content': (
                f"Added: {', '.join(l['food_name'] for l in logs)}. "
                f"Total: {sum(l['calories'] for l in logs)} calories."
            ) if logs else (
                "I couldn't parse specific food items from your request. "
                "Please describe the food more specifically."
            ),
        }
        conversation_history.append(ai_message)

        return jsonify({
            'logs': logs,
            'conversation_history': conversation_history,
        }), 200

    except Exception as e:
        current_app.logger.exception("AI conversation failed")
        return jsonify({
            'error': 'AI analysis failed. Please try again.',
            'conversation_history': conversation_history,
        }), 200
