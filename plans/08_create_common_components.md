# Plan: Create Common UI Components

## Overview
Build reusable UI components using Tailwind CSS and daisyUI.

## Tasks

### 1. Create src/components/common/Button.tsx
- Props: children, variant (primary/secondary/danger/ghost), size (sm/md/lg), isLoading, onClick, className, fullWidth
- Use daisyUI button classes
- Add loading spinner when isLoading
- Apply variant styles
- Support fullWidth option
- Minimum 44px touch target

### 2. Create src/components/common/Input.tsx
- Props: label, type, value, onChange, error, helperText, icon, disabled, required, className
- Support text, number, email, password types
- Show error message below input
- Show helper text below input
- Support left/right icons
- Use daisyUI input classes
- Focus states

### 3. Create src/components/common/Card.tsx
- Props: children, title, footer, className, padding
- Container with consistent padding and shadow
- Optional title header
- Optional footer slot
- Hover effects

### 4. Create src/components/common/Modal.tsx
- Props: isOpen, onClose, title, children, size (sm/md/lg), footer
- Backdrop with click-to-close
- Close button (X)
- Scrollable content area
- Mobile: full-screen modal
- Desktop: centered modal
- Focus trap for accessibility
- Prevent background scroll

### 5. Create src/components/common/Loading.tsx
- Spinner component with animation
- Skeleton loader variant
- Text loading state
- Size variants

### 6. Create src/components/common/ErrorFallback.tsx
- Props: error, retry
- Error message display
- Retry button
- Home link
- Use with React Error Boundary

### 7. Create src/components/common/index.ts
- Export all components
- Create unified import

## Expected Outcome
- Reusable button with variants
- Form input with validation display
- Card container for content
- Modal dialog system
- Loading states
- Error handling components
- All components accessible

## Notes
- Use daisyUI classes for base styling
- Add Tailwind utility classes for custom styles
- Ensure touch targets are 44px minimum
- Support keyboard navigation
- Test on mobile devices