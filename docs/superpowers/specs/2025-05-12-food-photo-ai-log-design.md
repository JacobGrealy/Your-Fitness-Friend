# Food Photo AI Log - Design Spec

## Overview

Add a new food logging option in the FAB (+) popup menu that lets users log food by taking/uploading a photo. AI analyzes the photo and pre-fills a review screen where the user can edit values, delete the log, converse with AI for updates, then accept to commit.

## UI Flow

### 1. FAB Menu
- Add "Log Food Photo" as 4th option in `FABModal.tsx`
- Uses camera SVG icon, same styling as existing options
- Navigates to `/food/photo-log`

### 2. Photo Capture Screen
- Full-width camera button (`capture="environment"`) and "Choose from Gallery" button
- On file selection: immediately transitions to review screen with AI analysis

### 3. Review Screen
- **Header**: "Review Log" with back button
- **Photo thumbnail**: captured image preview
- **Log entries** (scrollable list):
  - Each entry shows: editable food name input, editable macro inputs (calories, protein g, carbs g, fat g), meal type dropdown (breakfast/lunch/dinner/snack)
  - Delete button (trash icon) per entry
- **AI Message section**:
  - Message input with send button at bottom of scrollable area
  - Message bubbles showing user/AI conversation
  - When AI responds: new log entry pre-appended to the list
- **Accept button**: sticky at bottom, commits all entries to FoodLog, navigates back to food page

### 4. Loading Screen
- Shown during AI analysis / AI conversation
- DaisyUI spinner + contextual text ("Analyzing food..." / "Updating macros...")

## Backend API

### New Endpoint: `POST /api/meals/ai-log`

**Initial request** (first photo analysis):
```json
{
  "photo": "file (multipart)",
  "meal_type": "breakfast|lunch|dinner|snack",
  "conversation_history": []
}
```
- Saves photo to `app/uploads/ai_food_logs/{uuid}.{ext}`
- Sends image to `QwenClient.analyze_meal_photo()`
- Creates `FoodLog` entry with analysis results
- Returns: `{ logs: [{ id, food_name, calories, protein_g, carbs_g, fat_g, meal_type }], conversation_history: [{ role: "ai", content: "message" }] }`

**Follow-up request** (AI conversation):
```json
{
  "conversation_history": [
    { "role": "ai", "content": "..." },
    { "role": "user", "content": "add a side of rice" }
  ]
}
```
- Sends conversation history to Qwen with system prompt: "You are a nutritionist. The user previously uploaded a photo that was analyzed for nutrition. They are now asking about food modifications. Respond with JSON containing only the NEW/ADDED food items from their request, with calories, protein, carbs, and fat. If they want to remove something, respond with JSON containing the removed items with negative values."
- Creates additional `FoodLog` entry with updated values
- Returns updated `logs` array and full `conversation_history`

### Error Handling
- If Qwen fails: return error with message, keep photo, allow retry
- If file upload fails: show error, stay on capture screen

## State Management

Page manages its own local state (no global store needed):

```typescript
interface LogEntry {
  id: number | null;  // null until committed to DB
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: MealType;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
}

type Step = 'capture' | 'review' | 'loading';
```

## Files

| Action | File | Purpose |
|--------|------|---------|
| Create | `frontend/src/pages/Food/PhotoLog.tsx` | Main page component |
| Create | `app/routes/meals_ai_log.py` | New route blueprint |
| Modify | `app/routes/__init__.py` or `meals.py` | Register new route |
| Modify | `frontend/src/router.tsx` | Add `/food/photo-log` route |
| Modify | `frontend/src/components/layout/FABModal.tsx` | Add menu option |
| Modify | `frontend/src/types/food.ts` | Add `FoodLogCreateWithId` type if needed |

## Reused Components/Patterns

- `Modal.tsx` patterns for accessibility
- `QwenClient.analyze_meal_photo()` for AI analysis
- `FoodLog` model for database entries
- `MEAL_TYPES` constant from `utils/constants.ts`
- `formatCalories`, `formatMacros` from `utils/formatters.ts`
- Existing upload patterns from `meals.py` (uuid filenames, save to disk)
- Existing FABModal pattern for the + menu
- React Hook Form for input management (consistent with other log pages)
