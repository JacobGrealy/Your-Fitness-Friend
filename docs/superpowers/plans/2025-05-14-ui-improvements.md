# UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shadow to the header, refactor it into a 3-slot layout, move the diary date selector into the header, and reorder the FAB modal options.

**Architecture:** Three small, independent changes to existing frontend components. No new files needed.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

### Task 1: Add shadow to Header

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx:31`

- [ ] **Step 1: Add `shadow-md` to the header element**

In `frontend/src/components/layout/Header.tsx`, line 31, change:

```tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-[#185ADB]">
```

to:

```tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-[#185ADB] shadow-md">
```

- [ ] **Step 2: Verify**

Open the app in a browser. All pages with the header should now show a subtle shadow below the blue top bar, separating it from the `#f2f2f2` page background.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Header.tsx
git commit -m "style: add shadow to header for visual separation"
```

---

### Task 2: Refactor Header to 3-slot layout

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: Update HeaderProps interface**

In `frontend/src/components/layout/Header.tsx`, replace the interface (lines 4-9):

```tsx
interface HeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  rightContent?: React.ReactNode
}
```

with:

```tsx
interface HeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  leftContent?: React.ReactNode
  centerContent?: React.ReactNode
  rightContent?: React.ReactNode
}
```

- [ ] **Step 2: Update the function signature**

In `frontend/src/components/layout/Header.tsx`, replace the function declaration (line 11-16):

```tsx
export default function Header({
  title: propTitle,
  showBack = false,
  onBack,
  rightContent,
}: HeaderProps) {
```

with:

```tsx
export default function Header({
  title: propTitle,
  showBack = false,
  onBack,
  leftContent,
  centerContent,
  rightContent,
}: HeaderProps) {
```

- [ ] **Step 3: Update the component body**

Replace the entire return block (lines 30-65) with:

```tsx
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#185ADB] shadow-md">
      <div className="flex items-center justify-between w-full px-4 py-3 max-w-4xl mx-auto min-h-[48px]">
        <div className="flex items-center gap-2">
          {leftContent ?? (
            showBack && (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Go back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-1">
          {centerContent || (
            <h1 className="text-lg font-bold text-white">{propTitle}</h1>
          )}
        </div>

        <div className="flex items-center gap-1">
          {rightContent}
        </div>
      </div>
    </header>
  )
```

Key behavior:
- **Left slot:** Shows `leftContent` if provided, otherwise shows the back button when `showBack` is true
- **Center slot:** Shows `centerContent` if provided, otherwise shows the title (`propTitle`)
- **Right slot:** Unchanged — shows `rightContent` if provided

- [ ] **Step 4: Verify**

Open the app. All existing pages (Dashboard, Login, Register, Weight, Exercise, Food main page, etc.) should look identical to before — title centered in the blue header. The header should also show the shadow from Task 1.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/Header.tsx
git commit -m "refactor: make header a 3-slot free-form layout (left, center, right)"
```

---

### Task 3: Move date selector into Header for Diary screen

**Files:**
- Modify: `frontend/src/pages/Food/DailyFood.tsx`

- [ ] **Step 1: Import Header component**

Add this import at the top of `frontend/src/pages/Food/DailyFood.tsx`:

```tsx
import Header from '@/components/layout/Header'
```

- [ ] **Step 2: Replace the date selector bar with Header**

Remove the existing date selector div (lines 116-124 in current file):

```tsx
<div className="flex items-center justify-center gap-4 py-3 bg-white border-b border-[#e0e0e0]">
  <button onClick={handlePrevDay} className="p-1 text-[#185ADB] hover:bg-[#f2f2f2] rounded-full transition-colors" aria-label="Previous day">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
  </button>
  <button onClick={handleToday} className="px-3 py-1 text-sm font-medium text-[#212121] hover:bg-[#f2f2f2] rounded-full transition-colors">{formatDateLabel(currentDate)}</button>
  <button onClick={handleNextDay} className="p-1 text-[#185ADB] hover:bg-[#f2f2f2] rounded-full transition-colors" aria-label="Next day">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
  </button>
</div>
```

Replace it with a Header component placed at the top of the `return` block (before the `min-h-screen bg-[#f2f2f2] pb-4` div):

```tsx
<Header
  centerContent={
    <div className="flex items-center justify-center gap-4 text-white">
      <button onClick={handlePrevDay} className="p-1 text-white hover:bg-white/10 rounded-full transition-colors" aria-label="Previous day">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button onClick={handleToday} className="px-3 py-1 text-sm font-medium text-white hover:bg-white/10 rounded-full transition-colors">{formatDateLabel(currentDate)}</button>
      <button onClick={handleNextDay} className="p-1 text-white hover:bg-white/10 rounded-full transition-colors" aria-label="Next day">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  }
/>
```

- [ ] **Step 3: Verify**

Navigate to the Diary screen. The date selector should now appear inside the blue header bar instead of as a separate white bar below it. The "Diary" title should be hidden (no centerContent means title would show, but centerContent IS provided so the title is replaced). Navigation between days should work the same.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Food/DailyFood.tsx
git commit -m "feat: move date selector into header on Diary screen"
```

---

### Task 4: Reorder FAB modal options

**Files:**
- Modify: `frontend/src/components/layout/FABModal.tsx`

- [ ] **Step 1: Reorder the options array**

In `frontend/src/components/layout/FABModal.tsx`, replace the `options` array (lines 21-59):

```tsx
  const options = [
    {
      label: 'Log Food',
      path: '/food/log',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v4m0 0v6m0-6H6m6 0h6M4 10h16M5 16h14a1 1 0 001-1V9a1 1 0 00-1-1H5a1 1 0 00-1 1v6a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      label: 'Log Weight',
      path: '/weight/log',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
    },
    {
      label: 'Log Exercise',
      path: '/exercise/log',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
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
  ]
```

with:

```tsx
  const options = [
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
    {
      label: 'Log Food',
      path: '/food/log',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v4m0 0v6m0-6H6m6 0h6M4 10h16M5 16h14a1 1 0 001-1V9a1 1 0 00-1-1H5a1 1 0 00-1 1v6a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      label: 'Log Weight',
      path: '/weight/log',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
    },
    {
      label: 'Log Exercise',
      path: '/exercise/log',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ]
```

- [ ] **Step 2: Verify**

Open the app and tap the FAB (plus button). "Log Food Photo" should now be the first option at the top of the menu.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/FABModal.tsx
git commit -m "feat: move Log Food Photo to top of FAB menu"
```

---
