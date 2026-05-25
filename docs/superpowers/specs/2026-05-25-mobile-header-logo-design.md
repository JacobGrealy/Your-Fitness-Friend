# Mobile Header Logo Design

## Overview
Add a heart icon + "FitnessFriend" app name to the left side of the mobile top bar header. Page title remains absolutely centered. Logo area navigates to home when tapped.

## Scope
- Mobile-only (hidden on `sm:` breakpoint where sidebar shows brand)
- Sub-pages with back button retain existing behavior (back button replaces logo area)

## Design

### Layout
- **Left:** Heart icon (18px) + "FitnessFriend" text (13px semibold), flex-shrink-0, clickable → `/dashboard`
- **Center:** Page title absolutely positioned at `left:50%; transform:translateX(-50%)`
- **Right:** 90px invisible spacer to balance left side and keep title truly centered

### Styles
- Icon: SVG heart, stroke white, 2.5 stroke-width, 18x18
- Text: white, 13px, font-weight 600, 6px gap from icon
- Taps: cursor:pointer, optional hover:bg-white/10 transition

### Behavior
- Logo + text clickable, navigates to `/dashboard`
- When `showBack=true`, back button replaces logo area (existing `leftContent` logic)
- Hidden on `sm:` and above via `sm:hidden` class

## Implementation
- Modify `Header.tsx` — add logo section in left area, adjust center positioning
- No new dependencies
