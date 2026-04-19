# Plan: Create Layout Components

## Overview
Build layout components for navigation and page structure.

## Tasks

### 1. Create src/components/layout/BottomNav.tsx
- Props: activeItem, onNavigate
- 5 items: Dashboard, Weight, Exercise, Food, Photos
- Icon + label for each item
- Use daisyUI tab or custom implementation
- Active item highlighting
- Fixed position at bottom (mobile only)
- Hide on desktop using responsive classes
- Minimum 44px touch targets
- Bottom safe area padding for iOS

### 2. Create src/components/layout/Header.tsx
- Props: title, showBackButton, onBack, rightAction
- App name/logo on left
- User avatar + dropdown on right
- Desktop top navigation fallback
- Responsive: hide on mobile, show on desktop
- Consistent height
- Shadow or border bottom

### 3. Create src/components/layout/Layout.tsx
- Props: children
- Page wrapper with consistent padding
- Mobile: include BottomNav
- Desktop: include Header
- Flash message container
- Error boundary wrapper
- Responsive padding (sm on mobile, lg on desktop)

### 4. Create src/components/layout/index.ts
- Export all layout components
- Create unified import

## Expected Outcome
- Mobile bottom navigation bar
- Desktop top header
- Consistent page layout
- Responsive navigation switching
- Proper safe areas for mobile

## Notes
- BottomNav uses daisyUI tabs or custom flex layout
- Header uses daisyUI navbar component
- Layout wraps all pages
- Use Tailwind responsive classes (md:hidden, md:block)
- Test on both mobile and desktop