# Profile Photo Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to upload a profile photo displayed in the avatar bubble on the Profile page, separate from meal and weight photos.

**Architecture:** Single-column addition (`profile_photo_path`) to the existing `users` table. Files stored in `app/uploads/profile_photos/`. Flask endpoints on the auth blueprint for upload, delete, and serve. React frontend with `react-easy-crop` for circular image cropping. The Vite dev proxy at `/api` already forwards to Flask, so no proxy changes needed.

**Tech Stack:** Python 3.x/Flask, SQLite, Alembic migrations, React 18, TypeScript, Zustand, react-easy-crop

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/models/user.py` | Modify | Add `profile_photo_path` column |
| `app/config.py` | Modify | Add `profile_photos` allowed extensions |
| `app/routes/auth.py` | Modify | Add POST/DELETE/serve endpoints, update GET profile |
| `tests/test_routes.py` | Modify | Add `TestProfilePhotoRoutes` class |
| `frontend/src/api/types.ts` | Modify | Add `profile_photo_path` to `UserProfile` |
| `frontend/src/api/auth.ts` | Modify | Add `uploadProfilePhoto` / `deleteProfilePhoto` methods |
| `frontend/src/components/common/CropModal.tsx` | Create | Circular crop component |
| `frontend/src/pages/Profile.tsx` | Modify | Wire up crop modal, display photo, upload flow |
| `frontend/package.json` | Modify | Add `react-easy-crop` dependency |

---

### Task 1: Add `profile_photo_path` column to User model

**Files:**
- Modify: `app/models/user.py`

- [ ] **Step 1: Add the column to the User model**

Add after `weight_goal_lbs` (line 27):

```python
    profile_photo_path = db.Column(db.String(256), nullable=True)
```

Full context — the model should look like:

```python
class User(UserMixin, db.Model):
    """User model for authentication."""
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Profile information
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    height = db.Column(db.Float)  # in cm
    weight = db.Column(db.Float)  # current weight in kg
    activity_level = db.Column(db.String(20))  # sedentary, light, moderate, active, very active
    daily_calorie_goal = db.Column(db.Integer, default=2000)
    weight_goal_lbs = db.Column(db.Float, nullable=True)
    profile_photo_path = db.Column(db.String(256), nullable=True)
    
    # Relationships
    weight_logs = db.relationship('WeightLog', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    exercise_logs = db.relationship('ExerciseLog', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    saved_exercises = db.relationship('SavedExercise', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    food_logs = db.relationship('FoodLog', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    meal_photos = db.relationship('MealPhoto', backref='user', lazy='dynamic', cascade='all, delete-orphan')
```

- [ ] **Step 2: Verify the model change**

Run: `./venv/bin/python -c "from app import create_app, db; from app.models.user import User; app = create_app('testing'); app.app_context().push(); print(hasattr(User, 'profile_photo_path'))"`
Expected: `True`

- [ ] **Step 3: Commit**

```bash
git add app/models/user.py
git commit -m "feat: add profile_photo_path column to User model"
```

---

### Task 2: Add `profile_photos` to ALLOWED_EXTENSIONS

**Files:**
- Modify: `app/config.py`

- [ ] **Step 1: Add profile_photos extension set**

In `app/config.py`, modify the `ALLOWED_EXTENSIONS` dict (around line 31-35):

```python
    # Allowed file extensions
    ALLOWED_EXTENSIONS = {
        'weights': {'png', 'jpg', 'jpeg', 'gif'},
        'foods': {'png', 'jpg', 'jpeg', 'gif'},
        'meal_photos': {'png', 'jpg', 'jpeg', 'gif'},
        'profile_photos': {'png', 'jpg', 'jpeg', 'gif', 'webp'},
    }
```

- [ ] **Step 2: Commit**

```bash
git add app/config.py
git commit -m "feat: add profile_photos to allowed extensions"
```

---

### Task 3: Create database migration

**Files:**
- New: `migrations/versions/<hash>_add_profile_photo_path.py` (auto-generated)

- [ ] **Step 1: Generate migration**

Run from project root:
```bash
cd /home/angrygiant/github_projects/FitnessFriend && ./venv/bin/flask db migrate -m "add profile_photo_path to users"
```

- [ ] **Step 2: Apply migration**

Run:
```bash
./venv/bin/flask db upgrade
```

- [ ] **Step 3: Verify migration file exists**

Run: `ls migrations/versions/ | grep profile`
Expected: a file like `abc123_add_profile_photo_path.py`

- [ ] **Step 4: Commit**

```bash
git add migrations/versions/
git commit -m "chore: migration for profile_photo_path column"
```

---

### Task 4: Write tests for profile photo endpoints

**Files:**
- Modify: `tests/test_routes.py`

- [ ] **Step 1: Add test class to the end of test_routes.py**

Append this class after the existing `TestDashboardRoutes` class:

```python
class TestProfilePhotoRoutes:
    def _register_and_login(self, client):
        client.post('/api/auth/register', json={
            'username': 'photouser',
            'password': 'testpass123',
            'email': 'photo@test.com',
            'age': 25,
            'gender': 'male',
            'height': 175,
            'weight': 70
        })
        client.post('/api/auth/login', json={
            'email': 'photo@test.com',
            'password': 'testpass123'
        })

    def test_upload_profile_photo_success(self, client):
        self._register_and_login(client)
        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        response = client.post(
            '/api/auth/profile-photo',
            data={'photo': (jpeg_header + b'\x00' * 100, 'test.jpg')},
            content_type='multipart/form-data'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'profile_photo_url' in data
        assert data['profile_photo_url'].endswith('.jpg')

    def test_upload_profile_photo_no_file(self, client):
        self._register_and_login(client)
        response = client.post(
            '/api/auth/profile-photo',
            data={},
            content_type='multipart/form-data'
        )
        assert response.status_code == 400

    def test_upload_profile_photo_invalid_type(self, client):
        self._register_and_login(client)
        response = client.post(
            '/api/auth/profile-photo',
            data={'photo': (b'test content', 'test.txt')},
            content_type='multipart/form-data'
        )
        assert response.status_code == 400

    def test_delete_profile_photo(self, client):
        self._register_and_login(client)
        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        response = client.post(
            '/api/auth/profile-photo',
            data={'photo': (jpeg_header + b'\x00' * 100, 'test.jpg')},
            content_type='multipart/form-data'
        )
        assert response.status_code == 200
        response = client.delete('/api/auth/profile-photo')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    def test_serve_profile_photo(self, client):
        self._register_and_login(client)
        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        response = client.post(
            '/api/auth/profile-photo',
            data={'photo': (jpeg_header + b'\x00' * 100, 'test.jpg')},
            content_type='multipart/form-data'
        )
        data = response.get_json()
        photo_filename = data['profile_photo_url']
        response = client.get(f'/api/auth/uploads/{photo_filename}')
        assert response.status_code == 200

    def test_profile_photo_in_get_profile(self, client):
        self._register_and_login(client)
        response = client.get('/api/auth/profile')
        assert response.status_code == 200
        data = response.get_json()
        assert 'profile_photo_path' in data
        assert data['profile_photo_path'] is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./venv/bin/python -m pytest tests/test_routes.py::TestProfilePhotoRoutes -v`
Expected: All 6 tests FAIL with "route not found" or "500" errors

- [ ] **Step 3: Commit**

```bash
git add tests/test_routes.py
git commit -m "test: add profile photo route tests"
```

---

### Task 5: Implement POST /api/auth/profile-photo

**Files:**
- Modify: `app/routes/auth.py`

- [ ] **Step 1: Update imports**

Add `send_file` and `current_app` to the imports at line 3:

```python
from flask import Blueprint, request, jsonify, session, redirect, url_for, send_file, current_app
```

- [ ] **Step 2: Add upload endpoint**

Add after the `profile` route (after line 208, at the end of the file):

```python
@bp.route('/profile-photo', methods=['POST'])
@login_required
def upload_profile_photo():
    """Upload a profile photo for the current user."""
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo provided'}), 400

    file = request.files['photo']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Validate file extension
    if '.' not in file.filename:
        return jsonify({'error': 'Invalid file type. Only JPG, PNG, and WebP are allowed.'}), 400

    extension = file.filename.rsplit('.', 1)[1].lower()
    allowed = Config.ALLOWED_EXTENSIONS.get('profile_photos', set())
    if extension not in allowed:
        return jsonify({'error': 'Invalid file type. Only JPG, PNG, and WebP are allowed.'}), 400

    # Check file size (10MB max)
    if file.content_length and file.content_length > 10 * 1024 * 1024:
        return jsonify({'error': 'File too large. Maximum size is 10MB.'}), 400

    # Delete old photo if exists
    if current_user.profile_photo_path:
        old_path = os.path.join(
            current_app.root_path,
            'uploads',
            current_user.profile_photo_path
        )
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}.{extension}"

    # Save file
    upload_folder = os.path.join(
        current_app.root_path,
        'uploads',
        'profile_photos'
    )
    os.makedirs(upload_folder, exist_ok=True)
    filepath = os.path.join(upload_folder, unique_filename)
    file.save(filepath)

    # Store just the filename in DB
    current_user.profile_photo_path = unique_filename
    db.session.commit()

    return jsonify({
        'profile_photo_url': unique_filename
    }), 200
```

- [ ] **Step 3: Run the profile photo tests**

Run: `./venv/bin/python -m pytest tests/test_routes.py::TestProfilePhotoRoutes::test_upload_profile_photo_success -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/routes/auth.py
git commit -m "feat: add POST /api/auth/profile-photo upload endpoint"
```

---

### Task 6: Implement DELETE /api/auth/profile-photo

**Files:**
- Modify: `app/routes/auth.py`

- [ ] **Step 1: Add delete endpoint**

Add after the upload endpoint (at the end of the file):

```python
@bp.route('/profile-photo', methods=['DELETE'])
@login_required
def delete_profile_photo():
    """Delete the user's profile photo."""
    if current_user.profile_photo_path:
        file_path = os.path.join(
            current_app.root_path,
            'uploads',
            current_user.profile_photo_path
        )
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        current_user.profile_photo_path = None
        db.session.commit()

    return jsonify({'success': True}), 200
```

- [ ] **Step 2: Run delete test**

Run: `./venv/bin/python -m pytest tests/test_routes.py::TestProfilePhotoRoutes::test_delete_profile_photo -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/routes/auth.py
git commit -m "feat: add DELETE /api/auth/profile-photo endpoint"
```

---

### Task 7: Implement serve endpoint + update GET profile

**Files:**
- Modify: `app/routes/auth.py`

- [ ] **Step 1: Add serve endpoint**

Add after the delete endpoint (at the end of the file):

```python
@bp.route('/uploads/<path:filename>')
@login_required
def serve_profile_photo(filename):
    """Serve an uploaded profile photo."""
    upload_folder = os.path.join(current_app.root_path, 'uploads', 'profile_photos')
    filepath = os.path.join(upload_folder, filename)
    if os.path.exists(filepath):
        return send_file(filepath)
    return jsonify({'error': 'File not found'}), 404
```

- [ ] **Step 2: Run serve test**

Run: `./venv/bin/python -m pytest tests/test_routes.py::TestProfilePhotoRoutes::test_serve_profile_photo -v`
Expected: PASS

- [ ] **Step 3: Update GET /api/auth/profile to include profile_photo_path**

In the `profile()` route, find the GET response dict (around line 164-174) and add `profile_photo_path`:

```python
    if request.method == 'GET':
        user = {
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'age': current_user.age,
            'gender': current_user.gender,
            'height': current_user.height,
            'weight': current_user.weight,
            'activity_level': current_user.activity_level,
            'weight_goal_lbs': current_user.weight_goal_lbs,
            'profile_photo_path': current_user.profile_photo_path,
        }
        return jsonify(user)
```

- [ ] **Step 4: Update GET /api/auth/me to include profile_photo_path**

In the `get_current_user()` route (around line 145-156), add `profile_photo_path`:

```python
    user = {
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'age': current_user.age,
        'gender': current_user.gender,
        'height': current_user.height,
        'weight': current_user.weight,
        'activity_level': current_user.activity_level,
        'created_at': current_user.created_at.isoformat(),
        'profile_photo_path': current_user.profile_photo_path,
    }
    return jsonify(user)
```

- [ ] **Step 5: Run profile photo in GET profile test**

Run: `./venv/bin/python -m pytest tests/test_routes.py::TestProfilePhotoRoutes::test_profile_photo_in_get_profile -v`
Expected: PASS

- [ ] **Step 6: Run ALL profile photo tests**

Run: `./venv/bin/python -m pytest tests/test_routes.py::TestProfilePhotoRoutes -v`
Expected: All 6 tests PASS

- [ ] **Step 7: Run ALL tests**

Run: `./venv/bin/python -m pytest tests/ -v`
Expected: All tests pass (some skipped is OK)

- [ ] **Step 8: Commit**

```bash
git add app/routes/auth.py
git commit -m "feat: add serve endpoint and include profile_photo_path in GET responses"
```

---

### Task 8: Add react-easy-crop dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Add react-easy-crop to dependencies**

In `frontend/package.json`, add to the `dependencies` section:

```json
    "react-easy-crop": "5.5.2",
```

Full dependencies section should be:

```json
  "dependencies": {
    "axios": "1.14.0",
    "date-fns": "3.0.6",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-easy-crop": "5.5.2",
    "react-hook-form": "7.49.2",
    "react-router-dom": "6.21.0",
    "recharts": "2.10.3",
    "zustand": "4.4.7"
  },
```

- [ ] **Step 2: Install**

Run: `cd /home/angrygiant/github_projects/FitnessFriend/frontend && /home/angrygiant/.nvm/versions/node/v22.22.2/bin/node /home/angrygiant/.nvm/versions/node/v22.22.2/lib/node_modules/npm/bin/npm-cli.js install`

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add react-easy-crop dependency"
```

---

### Task 9: Add profile_photo_path to types + API methods

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/auth.ts`

- [ ] **Step 1: Add profile_photo_path to UserProfile interface**

In `frontend/src/api/types.ts`, modify the `UserProfile` interface (lines 12-24):

```typescript
export interface UserProfile {
  id: number
  username: string
  email: string
  age?: number
  gender?: string
  height?: number
  weight?: number
  weight_goal_lbs?: number
  activity_level?: string
  daily_calorie_goal?: number
  created_at?: string
  profile_photo_path?: string
}
```

- [ ] **Step 2: Add upload and delete methods to authApi**

In `frontend/src/api/auth.ts`, add after `updateProfile` (after line 27):

```typescript
  uploadProfilePhoto: async (formData: FormData) => {
    const response = await api.post('/auth/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  deleteProfilePhoto: async () => {
    const response = await api.delete('/auth/profile-photo')
    return response.data
  },
```

Full file should be:

```typescript
import api from './client'
import { LoginCredentials, RegisterData, UserProfile } from './types'

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  logout: async () => {
    await api.post('/auth/logout')
  },

  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/auth/profile')
    return response.data
  },

  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await api.put('/auth/profile', data)
    return response.data
  },

  uploadProfilePhoto: async (formData: FormData) => {
    const response = await api.post('/auth/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  deleteProfilePhoto: async () => {
    const response = await api.delete('/auth/profile-photo')
    return response.data
  },
}
```

- [ ] **Step 3: Type-check**

Run: `cd /home/angrygiant/github_projects/FitnessFriend/frontend && /home/angrygiant/.nvm/versions/node/v22.22.2/bin/node node_modules/.bin/tsc --noEmit 2>&1 | head -20`
Expected: no output (no errors)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/types.ts frontend/src/api/auth.ts
git commit -m "feat: add profile photo API methods and type"
```

---

### Task 10: Create CropModal component

**Files:**
- Create: `frontend/src/components/common/CropModal.tsx`

- [ ] **Step 1: Create the CropModal component**

Create `frontend/src/components/common/CropModal.tsx`:

```typescript
import { useState, useCallback, useRef } from 'react'
import { Crop, Coordinate } from 'react-easy-crop'

interface CropModalProps {
  isOpen: boolean
  onCropComplete: (croppedFile: File) => void
  onClose: () => void
}

function cropImageToCircle(
  imageSrc: string,
  croppedAreaPixels: { x: number; y: number; width: number; height: number },
  size: number
): Promise<File> {
  return new Promise((resolve) => {
    const image = new Image()
    image.src = imageSrc
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        size,
        size
      )

      ctx.globalCompositeOperation = 'destination-in'
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.fill()

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' })
          resolve(file)
        }
      }, 'image/jpeg', 0.9)
    }
  })
}

export default function CropModal({ isOpen, onCropComplete, onClose }: CropModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<string | null>(null)
  const [crop, setCrop] = useState<Coordinate>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [cropping, setCropping] = useState(false)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImage(url)
    }
  }, [])

  const onCropCompleteHandler = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!image || !croppedAreaPixels) return
    setCropping(true)
    try {
      const croppedFile = await cropImageToCircle(image, croppedAreaPixels, 256)
      onCropComplete(croppedFile)
    } finally {
      setCropping(false)
    }
  }

  const handleClose = () => {
    if (image) {
      URL.revokeObjectURL(image)
    }
    setImage(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setCropping(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-[#212121]">Crop Photo</h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#757575] hover:text-[#212121] text-xl"
          >
            {'\u00D7'}
          </button>
        </div>

        <div className="p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {!image ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-12 border-2 border-dashed border-gray-300 rounded-lg text-[#757575] hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">Choose a photo</span>
              </div>
            </button>
          ) : (
            <div className="relative" style={{ height: '300px' }}>
              <Crop
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropCompleteHandler}
                cropShape="round"
              />
            </div>
          )}

          {image && (
            <div className="mt-4">
              <label className="block text-sm text-[#757575] mb-1">Zoom</label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-200">
          {!image ? (
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 text-base font-medium bg-gray-100 text-[#212121] rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setImage(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                    fileInputRef.current.click()
                  }
                }}
                className="flex-1 py-2.5 text-base font-medium bg-gray-100 text-[#212121] rounded-lg hover:bg-gray-200 transition-colors"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={cropping}
                className="flex-1 py-2.5 text-base font-medium bg-[#185ADB] text-white rounded-lg hover:bg-[#1550C0] disabled:opacity-50 transition-colors"
              >
                {cropping ? 'Cropping...' : 'Crop'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/angrygiant/github_projects/FitnessFriend/frontend && /home/angrygiant/.nvm/versions/node/v22.22.2/bin/node node_modules/.bin/tsc --noEmit 2>&1 | head -20`
Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/common/CropModal.tsx
git commit -m "feat: add CropModal component with circular crop"
```

---

### Task 11: Update Profile page

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`

- [ ] **Step 1: Add imports and state**

Add to the top of `Profile.tsx` after existing imports (after line 7):

```typescript
import CropModal from '@/components/common/CropModal'
import { useRef, useCallback } from 'react'
```

Add after the existing state declarations (after line 13):

```typescript
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
```

- [ ] **Step 2: Add file selection and crop handlers**

Add before `handleSaveGoal` (before line 17):

```typescript
  const handleFileSelect = useCallback((file: File) => {
    setCropModalOpen(true)
  }, [])

  const handleCropComplete = async (croppedFile: File) => {
    setCropModalOpen(false)
    setUploadingPhoto(true)
    try {
      await authApi.uploadProfilePhoto(new FormData().set('photo', croppedFile))
      await checkAuth()
    } catch {
      alert('Failed to upload photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }
```

- [ ] **Step 3: Replace the avatar section**

Replace the entire blue header section (lines 54-71) with:

```typescript
      {/* Blue header bar */}
      <div className="bg-[#185ADB] px-4 pt-4 pb-3">
        <span className="text-white text-lg font-medium">More</span>
      </div>
      {/* White user info section */}
      <div className="bg-white px-4 py-4 mx-4 mt-4 rounded-lg">
        <div className="flex items-center justify-center gap-4">
          <div className="relative group">
            {user?.profile_photo_path ? (
              <img
                src={`/api/auth/uploads/${user.profile_photo_path}`}
                alt="Profile"
                className="rounded-full object-cover"
                style={{ width: '64px', height: '64px' }}
              />
            ) : (
              <div
                className="rounded-full bg-white flex items-center justify-center cursor-pointer"
                style={{ width: '64px', height: '64px' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-2xl" style={{ color: '#185ADB' }}>
                  {emailInitial}
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
              className="hidden"
            />
            {user?.profile_photo_path && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                className="absolute bottom-0 right-0 p-1 bg-[#185ADB] rounded-full text-white hover:bg-[#1550C0] transition-colors"
                style={{ width: '24px', height: '24px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <span className="text-base font-medium">{user?.email || ''}</span>
        </div>
      </div>
```

- [ ] **Step 4: Add CropModal at the bottom**

Add before the closing `</div>` of the main container (before line 185, after the Weight Goal Modal):

```typescript
      {/* Profile Photo Crop Modal */}
      <CropModal
        isOpen={cropModalOpen}
        onCropComplete={handleCropComplete}
        onClose={() => setCropModalOpen(false)}
      />
```

- [ ] **Step 5: Type-check**

Run: `cd /home/angrygiant/github_projects/FitnessFriend/frontend && /home/angrygiant/.nvm/versions/node/v22.22.2/bin/node node_modules/.bin/tsc --noEmit 2>&1 | head -20`
Expected: no output (no errors)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Profile.tsx
git commit -m "feat: wire up profile photo upload with crop modal"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- Data model (`profile_photo_path` column) → Task 1
- ALLOWED_EXTENSIONS → Task 2
- Migration → Task 3
- POST upload endpoint → Task 5
- DELETE endpoint → Task 6
- Serve endpoint → Task 7
- GET profile includes profile_photo_path → Task 7
- Frontend crop component → Task 10
- Frontend types + API methods → Task 9
- Frontend Profile page wiring → Task 11
- Backend tests → Task 4

**2. Placeholder scan:** No "TBD", "TODO", "fill in", or vague requirements found.

**3. Type consistency:** `profile_photo_path` is `db.String(256)` in model, `string` in TypeScript, same name throughout. Upload returns `profile_photo_url`, GET returns `profile_photo_path`.

**4. Ambiguity check:** File stored as just filename (e.g., `abc123.jpg`), not path-prefixed. Serve endpoint joins `uploads/profile_photos/` with filename. This avoids the double-nesting bug in the existing weight serve route.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-11-profile-photo-upload.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
