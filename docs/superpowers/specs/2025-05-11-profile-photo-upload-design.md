# Profile Photo Upload Design

> **Goal:** Allow users to upload a profile photo displayed in the avatar bubble on the Profile page.
> **Separate from:** meal photos and weight log photos.

---

## Data Model

- **Table:** `users` (existing)
- **New column:** `profile_photo_path` — `db.String(256)`, nullable, default `NULL`
- **File storage:** `app/uploads/profile_photos/`
- **Existing pattern:** Mirrors `WeightLog.photo_url` — a string path, not a separate table.

## Backend

### Files to modify

| File | Change |
|------|--------|
| `app/models/user.py` | Add `profile_photo_path` column |
| `app/routes/auth.py` | Add POST `/profile-photo` and DELETE `/profile-photo` endpoints |
| `app/config.py` | Add `profile_photos` to `ALLOWED_EXTENSIONS` |

### POST `/api/auth/profile-photo`

- Accepts `multipart/form-data` with field `photo`
- Validates: file present, type (jpg/png/webp), size <= 10MB
- Generates unique filename: `{uuid4}.{ext}`
- If user already has a profile photo, deletes old file from disk
- Saves to `app/uploads/profile_photos/{uuid}.{ext}`
- Stores relative path `profile_photos/{uuid}.{ext}` in DB
- Returns `{"profile_photo_url": "<path>"}`

### DELETE `/api/auth/profile-photo`

- Deletes existing photo file from disk
- Sets `profile_photo_path` to `NULL`
- Returns `{"success": true}`

### GET endpoints (no changes needed)

`/api/auth/profile` and `/api/auth/me` already return the full user object. Once `profile_photo_path` is added to the model, it will be included automatically.

### Migration

New Alembic migration: add `profile_photo_path` column to `users`.

## Frontend

### Files to create/modify

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/components/common/CropModal.tsx` | Create | Circular image crop component using `react-easy-crop` |
| `frontend/src/api/auth.ts` | Modify | Add `uploadProfilePhoto()` and `deleteProfilePhoto()` API methods |
| `frontend/src/api/types.ts` | Modify | Add `profile_photo_path` to `UserProfile` interface |
| `frontend/src/pages/Profile.tsx` | Modify | Replace avatar click with crop modal, show photo if available |
| `frontend/package.json` | Modify | Add `react-easy-crop` dependency |

### CropModal component

Props:
- `isOpen: boolean`
- `image: string | null` — object URL of selected image
- `onCropComplete: (croppedImage: File) => void`
- `onClose: () => void`

Uses `react-easy-crop` with `cropShape="round"`. On confirm, draws cropped image to a 256x256 canvas and exports as `image/jpeg` at quality 0.9. Returns a `File` object.

### Profile page changes

- Avatar circle becomes clickable when no photo is set
- When a photo is set, displays it as the avatar background image (circular)
- A small edit icon overlays the avatar, opens `CropModal`
- Upload shows a loading state on the edit button
- On upload success, the store refreshes and the new photo appears

### API methods

```typescript
// auth.ts
uploadProfilePhoto: (formData: FormData) =>
  api.post('/auth/profile-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data)

deleteProfilePhoto: () =>
  api.delete('/auth/profile-photo').then(res => res.data)
```

### Image serving

Follows the same pattern as `weight.py:serve_upload` (line 223). A new endpoint on the auth blueprint serves profile photos:

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

The frontend constructs the image URL as: `/api/auth/uploads/{filename}`.

## Error Handling

- File too large: return 400 with message
- Invalid file type: return 400 with message
- No file provided: return 400 with message
- Network error during upload: toast notification via existing `useUIStore.showToast()`
- Delete of non-existent file: silently succeed (idempotent)

## Dependencies

- `react-easy-crop` — circular crop with pinch-to-zoom
