# Plan: Create Authentication Pages

## Overview
Build login and registration pages with form validation.

## Tasks

### 1. Create src/pages/Auth/Login.tsx
- Use React Hook Form with loginSchema
- Fields: username, password
- Submit button with loading state
- Link to register page
- Error display from API
- Redirect to dashboard on success
- Use Input component
- Form centered on page

### 2. Create src/pages/Auth/Register.tsx
- Use React Hook Form with registerSchema
- Fields: username, email, password
- Profile fields: age, gender, height, weight (all optional)
- Daily calorie goal (auto-calculated or manual)
- Submit button with loading state
- Link to login page
- Error display from API
- Redirect to dashboard on success
- Use Input component with appropriate types

### 3. Create src/pages/Auth/index.ts
- Export both pages
- Create unified import

### 4. Create ProtectedRoute wrapper component
- Props: children
- Check authentication state
- Redirect to login if not authenticated
- Use authStore

## Expected Outcome
- Working login form with validation
- Working registration form with validation
- Redirect after successful auth
- Error handling for API failures
- Protected route wrapper

## Notes
- Use zodResolver with React Hook Form
- Show inline validation errors
- Show API error messages
- Password field should be type="password"
- Consider "remember me" functionality
- Add loading states during API calls