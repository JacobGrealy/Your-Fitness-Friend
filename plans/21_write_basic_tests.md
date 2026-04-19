# Plan: Write Basic Tests

## Overview
Create basic tests for critical components and flows.

## Tasks

### 1. Test API Layer
- Create tests/api/client.test.ts
- Test Axios instance creation
- Test token attachment in request interceptor
- Test error handling in response interceptor

### 2. Test State Management
- Create tests/store/authStore.test.ts
- Test login action
- Test logout action
- Test isAuthenticated selector
- Test token persistence

### 3. Test Validation Schemas
- Create tests/utils/validation.test.ts
- Test registerSchema with valid data
- Test registerSchema with invalid data
- Test loginSchema
- Test other form schemas

### 4. Test Formatters
- Create tests/utils/formatters.test.ts
- Test formatWeight
- Test formatCalories
- Test formatMacros
- Test formatDate

### 5. Test Key Components
- Create tests/components/Button.test.tsx
- Test Button renders correctly
- Test Button variants
- Test Button loading state

- Create tests/components/Input.test.tsx
- Test Input renders correctly
- Test Input error display
- Test Input change handler

- Create tests/components/Modal.test.tsx
- Test Modal opens/closes
- Test Modal backdrop click
- Test Modal escape key

### 6. Test Critical Pages
- Create tests/pages/Auth/Login.test.tsx
- Test form validation
- Test form submission
- Test error display

- Create tests/pages/Dashboard.test.tsx
- Test data loading
- Test error state
- Test rendering

## Expected Outcome
- API layer tested
- State management tested
- Validation schemas tested
- Key components tested
- Critical pages tested

## Notes
- Focus on critical paths
- Use React Testing Library best practices
- Mock API calls
- Test user interactions
- Aim for 70%+ coverage on critical code