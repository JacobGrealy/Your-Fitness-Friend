# Food Photo AI Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new food logging option in the FAB (+) popup menu that lets users log food by taking/uploading a photo. AI analyzes the photo and pre-fills a review screen where the user can edit values, delete logs, converse with AI for updates, then accept to commit.

**Architecture:** New Flask route at `POST /api/meals/ai-log` that accepts a photo + optional conversation history, uses existing QwenClient for AI analysis, and creates FoodLog entries. Frontend gets a new page at `/food/photo-log` with capture → review → AI conversation → accept flow, linked from FABModal.

**Tech Stack:** Flask (Python), React + TypeScript, Tailwind CSS, Zustand, Qwen AI, SQLAlchemy

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `app/routes/meals_ai_log.py` | New Flask blueprint with `POST /api/meals/ai-log` |
| Modify | `app/routes/__init__.py:1-17` | Export new blueprint |
| Modify | `app/__init__.py:54` | Register new blueprint |
| Create | `frontend/src/api/mealsAiLog.ts` | API client for new endpoint |
| Create | `frontend/src/types/foodPhotoLog.ts` | TypeScript types for the feature |
| Create | `frontend/src/pages/Food/PhotoLog.tsx` | Main page component (capture → review → conversation) |
| Modify | `frontend/src/router.tsx:8,106-121` | Import and register `/food/photo-log` route |
| Modify | `frontend/src/components/layout/FABModal.tsx:21-49` | Add "Log Food Photo" menu option |

---

### Task 1: Backend — Create AI Log Route

**Files:**
- Create: `app/routes/meals_ai_log.py`
- Modify: `app/routes/__init__.py:8,9-16`
- Modify: `app/__init__.py:54,60`

- [ ] **Step 1: Create the new route file**

Create `app/routes/meals_ai_log.py`:

```python
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from app.models.food_log import FoodLog
from app.utils.qwen_client import qwen_client
from app.config import Config
import os
import base64
import uuid
import json
import re

bp = Blueprint('meals_ai_log', __name__)

UPLOAD_FOLDER = 'ai_food_logs'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_uploaded_file(file):
    if not allowed_file(file.filename):
        return None, "Invalid file type. Only JPG and PNG are allowed."
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
    try:
        # Try to extract JSON from the response
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
    # Fallback: try to find JSON in response
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
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        photo_path, error = save_uploaded_file(file)
        if error:
            return jsonify({'error': error}), 400

        full_path = os.path.join(current_app.root_path, 'uploads', photo_path)
        image_base64 = encode_file_to_base64(full_path)

        meal_type = request.form.get('meal_type', 'lunch')

        try:
            analysis = qwen_client.analyze_meal_photo(image_base64)
            analysis_data = {
                'calories': int(analysis['calories']),
                'protein': float(analysis['protein']),
                'carbs': float(analysis['carbs']),
                'fat': float(analysis['fat']),
            }
            food_name = ', '.join(analysis.get('items', ['Analyzed meal']))[:120]
        except Exception:
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

            logs = [{
                'id': food_log.id,
                'food_name': food_log.food_name,
                'calories': food_log.calories,
                'protein_g': food_log.protein_g,
                'carbs_g': food_log.carbs_g,
                'fat_g': food_log.fat_g,
                'meal_type': food_log.meal_type,
            }]
        else:
            logs = []

        conversation_history = [{
            'role': 'ai',
            'content': f"Analyzed your {meal_type}. Estimated: {analysis_data['calories']} calories, {analysis_data['protein']}g protein, {analysis_data['carbs']}g carbs, {analysis_data['fat']}g fat." if analysis_data else "Could not analyze the photo. Please try again."
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

    conversation_history = data.get('conversation_history', [])
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
        # Send to Qwen API
        payload = {
            "model": "qwen",
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 300,
        }
        import requests
        response = requests.post(
            f"{qwen_client.base_url}/chat/completions",
            json=payload,
            timeout=qwen_client.timeout,
        )
        response.raise_for_status()
        ai_content = response.json()['choices'][0]['message']['content']

        # Parse the AI response
        parsed = parse_ai_nutrition(ai_content)

        if not parsed:
            # Try extracting multiple items from JSON
            items = []
            match = re.search(r'\{[^{}]*"items"[^{}]*\}', ai_content, re.DOTALL)
            if match:
                try:
                    result = json.loads(match.group())
                    items = result.get('items', [])
                except json.JSONDecodeError:
                    items = []

            if items:
                logs = []
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
                        logs.append({
                            'id': food_log.id,
                            'food_name': food_log.food_name,
                            'calories': food_log.calories,
                            'protein_g': food_log.protein_g,
                            'carbs_g': food_log.carbs_g,
                            'fat_g': food_log.fat_g,
                            'meal_type': food_log.meal_type,
                        })
                db.session.commit()
            else:
                db.session.rollback()

        # Build response
        ai_message = {
            'role': 'ai',
            'content': user_message,  # Will be updated below
        }
        conversation_history.append({'role': 'user', 'content': user_message})

        # Generate a user-friendly AI response
        if logs:
            total_cal = sum(l['calories'] for l in logs)
            ai_message['content'] = (
                f"Added: {', '.join(l['food_name'] for l in logs)}. "
                f"Total: {total_cal} calories."
            )
        else:
            ai_message['content'] = (
                "I couldn't parse specific food items from your request. "
                "Please describe the food more specifically."
            )

        conversation_history.append(ai_message)

        return jsonify({
            'logs': logs if logs else [],
            'conversation_history': conversation_history,
        }), 200

    except Exception as e:
        return jsonify({
            'error': 'AI analysis failed. Please try again.',
            'conversation_history': conversation_history,
        }), 200
```

- [ ] **Step 2: Register the blueprint in routes/__init__.py**

Modify `app/routes/__init__.py` — add import and export:

```python
from app.routes.meals_ai_log import bp as meals_ai_log_bp
```

Add to `__all__`:

```python
    'meals_ai_log_bp',
```

- [ ] **Step 3: Register the blueprint in app/__init__.py**

Modify `app/__init__.py:54` — add import:

```python
from app.routes import auth_bp, weight_bp, exercise_bp, food_bp, meals_bp, meals_ai_log_bp, user_bp, dashboard_bp
```

Modify `app/__init__.py:59-60` — add registration after meals_bp:

```python
app.register_blueprint(meals_bp, url_prefix='/api/meals')
app.register_blueprint(meals_ai_log_bp, url_prefix='/api/meals')
```

- [ ] **Step 4: Verify backend syntax**

Run: `./venv/bin/python -c "from app.routes.meals_ai_log import bp; print('OK')"`
Expected: `OK`

---

### Task 2: Frontend — Add API Client and Types

**Files:**
- Create: `frontend/src/api/mealsAiLog.ts`
- Create: `frontend/src/types/foodPhotoLog.ts`

- [ ] **Step 1: Create TypeScript types**

Create `frontend/src/types/foodPhotoLog.ts`:

```typescript
/**
 * Types for the food photo AI log feature.
 */

/**
 * A log entry returned from the AI analysis or conversation.
 */
export interface FoodPhotoLogEntry {
  id: number | null
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

/**
 * A message in the AI conversation.
 */
export interface FoodPhotoMessage {
  role: 'user' | 'ai'
  content: string
}

/**
 * Response from the AI log endpoint.
 */
export interface AiLogResponse {
  logs: FoodPhotoLogEntry[]
  conversation_history: FoodPhotoMessage[]
  photo_path?: string
  error?: string
}
```

- [ ] **Step 2: Create API client**

Create `frontend/src/api/mealsAiLog.ts`:

```typescript
import { api } from './client'
import type { AiLogResponse } from '@/types/foodPhotoLog'

export const mealsAiLogApi = {
  /**
   * Initial photo upload with AI analysis.
   */
  analyzePhoto: (formData: FormData) =>
    api.post<AiLogResponse>('/meals/ai-log', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),

  /**
   * Follow-up AI conversation to update macros.
   */
  sendMessage: (conversationHistory: { role: string; content: string }[], userMessage: string) =>
    api.post<AiLogResponse>('/meals/ai-log', {
      conversation_history: conversationHistory,
      user_message: userMessage,
    }).then(res => res.data),
}
```

---

### Task 3: Frontend — Create PhotoLog Page Component

**Files:**
- Create: `frontend/src/pages/Food/PhotoLog.tsx`

- [ ] **Step 1: Create the PhotoLog page component**

Create `frontend/src/pages/Food/PhotoLog.tsx`:

```tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mealsAiLogApi } from '@/api/mealsAiLog'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import Loading from '@/components/common/Loading'
import { formatMacros } from '@/utils/formatters'
import type { FoodPhotoLogEntry, FoodPhotoMessage } from '@/types/foodPhotoLog'
import { MEAL_TYPES } from '@/utils/constants'
import { useFoodStore } from '@/store/foodStore'

type Step = 'capture' | 'review' | 'loading'

const MEAL_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

export default function PhotoLog() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const foodStore = useFoodStore()

  const [step, setStep] = useState<Step>('capture')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [logEntries, setLogEntries] = useState<FoodPhotoLogEntry[]>([])
  const [messages, setMessages] = useState<FoodPhotoMessage[]>([])
  const [userMessage, setUserMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setTitle('Log Food Photo') }, [setTitle])

  useEffect(() => {
    if (step === 'review' && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [step, messages, logEntries])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleCapture = useCallback(async () => {
    if (!selectedFile) return
    setStep('loading')

    const formData = new FormData()
    formData.append('photo', selectedFile)
    formData.append('meal_type', 'lunch')

    try {
      const response = await mealsAiLogApi.analyzePhoto(formData)
      setLogEntries(response.logs)
      setMessages(response.conversation_history)
      setStep('review')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze photo')
      setStep('capture')
    }
  }, [selectedFile])

  const handleSendMessage = useCallback(async () => {
    if (!userMessage.trim()) return
    setStep('loading')

    const newMessages: FoodPhotoMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ]

    try {
      const response = await mealsAiLogApi.sendMessage(
        newMessages.filter(m => m.role === 'ai'),
        userMessage,
      )

      // Append new AI message
      const aiMessage = response.conversation_history.find(
        m => m.role === 'ai' && m.content !== newMessages[newMessages.length - 1]?.content,
      )
      if (aiMessage) {
        setMessages([...newMessages, aiMessage])
      } else {
        setMessages([...newMessages])
      }

      // Prepend new log entries
      if (response.logs && response.logs.length > 0) {
        setLogEntries(prev => [...prev, ...response.logs])
      }

      setUserMessage('')
      setStep('review')
    } catch (err: any) {
      setMessages([...newMessages, { role: 'ai', content: err.response?.data?.error || 'Failed to get response' }])
      setError(err.response?.data?.error || 'Failed to get response')
      setStep('review')
    }
  }, [userMessage, messages])

  const handleEditEntry = useCallback((index: number, field: keyof FoodPhotoLogEntry, value: string | number) => {
    setLogEntries(prev => prev.map((entry, i) => {
      if (i === index) {
        return { ...entry, [field]: value }
      }
      return entry
    }))
  }, [])

  const handleDeleteEntry = useCallback((index: number) => {
    setLogEntries(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleAccept = useCallback(async () => {
    if (logEntries.length === 0) return

    try {
      for (const entry of logEntries) {
        await foodStore.logFood({
          food_name: entry.food_name,
          calories: entry.calories,
          protein_g: entry.protein_g,
          carbs_g: entry.carbs_g,
          fat_g: entry.fat_g,
          meal_type: entry.meal_type,
        })
      }
      navigate('/food')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save food logs')
      setStep('review')
    }
  }, [logEntries, foodStore, navigate])

  const handleBack = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    navigate(-1)
  }, [previewUrl, navigate])

  return (
    <div className="bg-[#f2f2f2] min-h-screen pt-14 sm:pt-0 pb-20 sm:pb-0">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#185ADB] text-white px-4 py-3 flex items-center gap-3 z-10 sm:hidden">
        <button onClick={handleBack} className="text-white text-xl">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">Log Food Photo</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-[#E53935]">{error}</p>
          </div>
        </div>
      )}

      {/* Capture Step */}
      {step === 'capture' && (
        <div className="p-4 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleInputChange}
            className="hidden"
          />

          <div
            className="bg-white rounded-xl p-6 text-center cursor-pointer border-2 border-dashed border-gray-300 hover:border-[#185ADB] transition-colors"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                fileInputRef.current?.click()
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-lg font-semibold text-[#212121]">Take a Photo</p>
            <p className="text-sm text-[#757575] mt-1">or choose from gallery</p>
          </div>

          {previewUrl && (
            <div className="bg-white rounded-xl p-3">
              <img src={previewUrl} alt="Preview" className="w-full max-h-[300px] object-contain rounded-lg" />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setPreviewUrl(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="flex-1 py-2 text-sm font-medium text-[#185ADB] border border-[#185ADB] rounded-lg"
                >
                  Retake
                </button>
                <button
                  onClick={handleCapture}
                  className="flex-1 py-2 text-sm font-medium text-white bg-[#185ADB] rounded-lg"
                >
                  Analyze
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Step */}
      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loading text={messages.length > 0 ? 'Updating macros...' : 'Analyzing food...'} />
        </div>
      )}

      {/* Review Step */}
      {step === 'review' && (
        <div className="px-4 space-y-4 pb-32">
          {/* Photo preview */}
          {previewUrl && (
            <div className="bg-white rounded-xl p-3">
              <img src={previewUrl} alt="Food" className="w-full max-h-[200px] object-contain rounded-lg" />
            </div>
          )}

          {/* Log Entries */}
          {logEntries.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[#212121]">Food Logs</h2>
              {logEntries.map((entry, index) => (
                <div key={`${index}-${entry.id}`} className="bg-white rounded-xl p-4 space-y-3">
                  {/* Row 1: Name + Delete */}
                  <div className="flex items-start gap-2">
                    <input
                      type="text"
                      value={entry.food_name}
                      onChange={(e) => handleEditEntry(index, 'food_name', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                    />
                    <button
                      onClick={() => handleDeleteEntry(index)}
                      className="text-[#E53935] p-2"
                      aria-label="Delete log"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Meal type */}
                  <select
                    value={entry.meal_type}
                    onChange={(e) => handleEditEntry(index, 'meal_type', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                  >
                    {MEAL_TYPES.map(type => (
                      <option key={type} value={type}>{MEAL_LABELS[MEAL_TYPES.indexOf(type)]}</option>
                    ))}
                  </select>

                  {/* Macros grid */}
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-[#757575] mb-1">Cal</label>
                      <input
                        type="number"
                        value={entry.calories}
                        onChange={(e) => handleEditEntry(index, 'calories', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-center text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#757575] mb-1">Protein (g)</label>
                      <input
                        type="number"
                        value={entry.protein_g}
                        onChange={(e) => handleEditEntry(index, 'protein_g', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-center text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#757575] mb-1">Carbs (g)</label>
                      <input
                        type="number"
                        value={entry.carbs_g}
                        onChange={(e) => handleEditEntry(index, 'carbs_g', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-center text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#757575] mb-1">Fat (g)</label>
                      <input
                        type="number"
                        value={entry.fat_g}
                        onChange={(e) => handleEditEntry(index, 'fat_g', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-center text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
                        min="0"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[#212121]">AI Conversation</h2>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`rounded-xl px-4 py-2 max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-[#185ADB] text-white ml-auto'
                      : 'bg-white text-[#212121] mr-auto'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && userMessage.trim()) {
                  handleSendMessage()
                }
              }}
              placeholder="Ask AI to update (e.g., 'add rice')"
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#185ADB]"
            />
            <button
              onClick={handleSendMessage}
              disabled={!userMessage.trim()}
              className="w-10 h-10 bg-[#185ADB] text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Accept Button - sticky at bottom */}
      {step === 'review' && logEntries.length > 0 && (
        <div className="fixed bottom-16 sm:bottom-4 left-0 right-0 px-4 bg-[#f2f2f2] pt-3">
          <button
            onClick={handleAccept}
            className="w-full bg-[#185ADB] text-white font-medium py-3 rounded-xl hover:bg-[#1552B6] transition-colors text-sm shadow-lg"
          >
            Accept ({logEntries.length} log{logEntries.length !== 1 ? 's' : ''})
          </button>
        </div>
      )}
    </div>
  )
}
```

---

### Task 4: Frontend — Register Route and FAB Menu Option

**Files:**
- Modify: `frontend/src/router.tsx:8,106-121`
- Modify: `frontend/src/components/layout/FABModal.tsx:21-49`

- [ ] **Step 1: Add route to router.tsx**

Modify import at top of `frontend/src/router.tsx`:

Change line 8 from:
```tsx
import { Food, DailyFood, LogFood, CustomFoods } from './pages/Food'
```
to:
```tsx
import { Food, DailyFood, LogFood, CustomFoods, PhotoLog } from './pages/Food'
```

Add route after the `food/custom` route (around line 121):
```tsx
{
  path: 'food/photo-log',
  element: (
    <AuthGuard>
      <PhotoLog />
    </AuthGuard>
  ),
},
```

- [ ] **Step 2: Add PhotoLog export from Food index**

Check if `frontend/src/pages/Food/index.ts` exists. If it does, add `PhotoLog` export. If not, the direct import in router.tsx is fine.

- [ ] **Step 3: Add menu option to FABModal.tsx**

Modify `frontend/src/components/layout/FABModal.tsx` — add new option to the `options` array (after "Log Exercise", before the closing `]`):

```typescript
{
  label: 'Log Food Photo',
  path: '/food/photo-log',
  icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
},
```

---

### Task 5: Verify and Test

**Files:**
- Backend: `./venv/bin/python -c "from app import create_app; app = create_app(); print('Backend OK')"`
- Frontend: `cd frontend && npm run build` (or check for TS errors)

- [ ] **Step 1: Verify backend imports**

Run: `./venv/bin/python -c "from app.routes.meals_ai_log import bp; print('Backend OK')"`
Expected: `Backend OK`

- [ ] **Step 2: Check frontend TypeScript compilation**

Run: `cd frontend && /home/angrygiant/.nvm/versions/node/v22.22.2/bin/node node_modules/typescript/bin/tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Manual test flow**

1. Start backend: `./venv/bin/python main.py`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to the app, tap the + FAB button
4. Tap "Log Food Photo"
5. Take/upload a photo of food
6. Verify AI analysis appears in review screen
7. Edit a macro value directly
8. Send a message like "add a side of rice"
9. Verify loading screen appears, then new entry is added
10. Click Accept and verify food logs appear on the food page
