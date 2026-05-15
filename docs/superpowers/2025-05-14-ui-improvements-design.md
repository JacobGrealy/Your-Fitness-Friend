# UI Improvements Design

## 1. Header Shadow

**Problem:** The blue top bar blends into the `#f2f2f2` page background with no visual separation.

**Solution:** Add `shadow-md` to the `<header>` element in `Header.tsx`.

```tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-[#185ADB] shadow-md">
```

## 2. Header 3-Slot Layout

**Current:** Header has a back button area, a centered title, and a right content area. The title is hardcoded as a `<h1>` in the center.

**Design:** Replace the hardcoded title with a 3-slot free-form layout: `left`, `center`, `right`. Each slot accepts any `ReactNode`. The title is the default center content when no `centerContent` is passed.

### Header.tsx changes

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

- `leftContent` — replaces the back button area (back button sits inside this slot when `showBack` is true)
- `centerContent` — when provided, renders this instead of the title; when omitted, renders `title` as before
- `rightContent` — unchanged

**Layout structure:**
```
<header>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">       ← left slot
      {leftContent or back button}
    </div>
    <div class="flex items-center gap-1">       ← center slot
      {centerContent or title}
    </div>
    <div class="flex items-center gap-1">       ← right slot
      {rightContent}
    </div>
  </div>
</header>
```

### DailyFood.tsx changes

Pass `centerContent` with the date selector, hide the title:

```tsx
<Header
  showBack={false}
  centerContent={
    <div className="flex items-center justify-center gap-4 text-white">
      {/* date selector buttons — styled for blue header bg */}
    </div>
  }
/>
```

The date selector markup moves from `DailyFood.tsx`'s main content into the header's center slot. The white background and bottom border are removed since it renders inside the blue header. Button text/icons use white color to contrast with the blue background.

## 3. FABModal Reorder

In `FABModal.tsx`, reorder the `options` array so "Log Food Photo" is first:

```
1. Log Food Photo  → /food/photo-log
2. Log Food        → /food/log
3. Log Weight      → /weight/log
4. Log Exercise    → /exercise/log
```

No other changes.
