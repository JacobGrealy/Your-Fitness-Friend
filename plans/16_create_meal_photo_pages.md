# Plan: Create Meal Photo Pages

## Overview
Build meal photo upload and gallery pages.

## Tasks

### 1. Create src/pages/Meals/UploadPhoto.tsx
- Camera button (opens camera on mobile: capture="camera")
- File picker button (input type="file" accept="image/*")
- Meal type selector (breakfast/lunch/dinner/snack)
- Upload progress indicator
- Success/error feedback
- Recent photos preview after upload
- Use Input component
- Handle FormData for multipart upload

### 2. Create src/pages/Meals/PhotoGallery.tsx
- Fetch meal photos on mount
- Grid view of meal photos (2 cols mobile, 3-4 cols desktop)
- Each card: photo thumbnail, date, meal type
- Click to view full size (modal)
- Delete button (long press on mobile)
- Filter by date range
- Empty state if no photos
- Use Card component

### 3. Create src/pages/Meals/index.ts
- Export all meal pages
- Create unified import

## Expected Outcome
- Photo upload with camera support
- Photo gallery grid
- Full-screen photo viewer
- Delete functionality

## Notes
- Use FormData for file upload
- Show progress during upload
- Compress images if needed
- Handle upload errors gracefully
- Mobile: use capture="camera" for direct camera access
- Desktop: use standard file picker
- Optimize image display (lazy loading)
- Test camera access on mobile devices