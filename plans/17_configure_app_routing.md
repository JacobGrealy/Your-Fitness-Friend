# Plan: Configure App Routing and Entry

## Overview
Set up React Router and main App component with all pages.

## Tasks

### 1. Create src/App.tsx
- Import BrowserRouter from react-router-dom
- Import all pages
- Import ProtectedRoute wrapper
- Define routes:
  - Public routes: /login, /register
  - Protected routes: /, /weight/*, /exercise/*, /food/*, /meals/*
- Configure route structure with nested routes
- Add loading and error boundaries
- Configure scroll restoration

### 2. Create src/main.tsx
- Import React
- Import ReactDOM
- Import App
- Import index.css
- Render App to root element
- Add error boundary wrapper

### 3. Create Error Boundary Component
- Create src/components/common/ErrorBoundary.tsx
- Catch rendering errors
- Display error fallback
- Retry button

### 4. Configure React Router
- Set up public routes (login, register)
- Set up protected routes (dashboard, weight, exercise, food, meals)
- Configure 404 page
- Add route guards

### 5. Set Up Index Page
- Root path (/) redirects to dashboard
- Configure SPA catch-all in Flask backend

## Expected Outcome
- React Router configured
- All routes working
- Protected routes redirect to login
- 404 page for unknown routes
- App entry point configured

## Notes
- Use lazy loading for code splitting
- Configure route transitions
- Add page titles
- Handle scroll position on navigation
- Ensure proper route hierarchy