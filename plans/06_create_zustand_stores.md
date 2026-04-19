# Plan: Create Zustand Stores

## Overview
Set up Zustand stores for global state management (auth and UI state).

## Tasks

### 1. Create src/store/authStore.ts
- Import createStore from zustand
- Define state interface:
  - user: User | null
  - token: string | null
  - isAuthenticated: boolean (computed)
- Define actions:
  - setUser(user): Set user data
  - setToken(token): Set JWT token
  - login(user, token): Set both user and token
  - logout(): Clear user, token, and localStorage
  - updateUser(updates): Partial update of user
- Persist token to localStorage using zustand persist middleware
- Create selectors for:
  - isAuthenticated
  - userId
  - username

### 2. Create src/store/uiStore.ts
- Define state interface:
  - mobileMenuOpen: boolean
  - activeModal: string | null (modal identifier)
  - activeNavItem: string (current bottom nav item)
  - theme: 'light' | 'dark'
- Define actions:
  - toggleMobileMenu(): Toggle mobile menu
  - closeMobileMenu(): Close mobile menu
  - openModal(modalId): Open specified modal
  - closeModal(): Close modal
  - setActiveNavItem(item): Set active nav item
  - setTheme(theme): Set theme
- Persist theme preference to localStorage
- Create selectors for:
  - isMobileMenuOpen
  - isModalOpen
  - currentTheme

### 3. Create src/store/index.ts
- Export both stores
- Create combined store types if needed

### 4. Create src/hooks/useAuth.ts
- Import useAuthStore from store
- Create custom hook that returns:
  - user, token, isAuthenticated from store
  - login, logout, updateUser actions
- Add error handling for auth failures

### 5. Create src/hooks/useUI.ts
- Import useUIStore from store
- Create custom hook that returns:
  - mobileMenuOpen, activeModal, activeNavItem, theme
  - toggleMobileMenu, openModal, closeModal, setTheme actions

## Expected Outcome
- Auth state managed globally with Zustand
- Token persisted to localStorage
- UI state (modals, nav, theme) managed globally
- Custom hooks for easy component integration
- Type-safe state access

## Notes
- Use zustand persist middleware for localStorage
- Keep stores focused (auth vs UI)
- Use selectors for derived state
- Avoid storing sensitive data beyond token