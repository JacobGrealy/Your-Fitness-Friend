# Plan 2: Authentication & User Models

**Status: ✅ COMPLETED** - 2026-04-01

## Objective
Implement user authentication and core user model with profile management.

## Tasks

### 2.1 User Model (models/user.py)
Fields:
- id (Integer, PK)
- email (String, unique, indexed)
- password_hash (String)
- name (String)
- age (Integer, nullable)
- gender (String: 'male', 'female', 'other')
- height_cm (Float, nullable)
- current_weight_kg (Float, nullable)
- activity_level (String: 'sedentary', 'light', 'moderate', 'active', 'very_active')
- daily_calorie_goal (Integer)
- created_at (DateTime)

### 2.2 Authentication Routes (routes/auth.py)
Endpoints:
- `POST /api/auth/register` - Create user account
  - Validate email format
  - Check email uniqueness
  - Hash password with Werkzeug
  - Set default calorie goal based on BMR calculation
  
- `POST /api/auth/login` - User login
  - Verify email and password
  - Create session with Flask-Login
  
- `POST /api/auth/logout` - User logout
  - Destroy session
  
- `GET /api/auth/me` - Get current user info
  - Return user profile (without password_hash)

### 2.3 Protected Route Decorator
Create `@require_auth` decorator:
- Check if user is logged in
- Redirect or return 401 if not

### 2.4 Password Hashing
- Use `werkzeug.security.generate_password_hash`
- Use `werkzeug.security.check_password_hash` for verification

### 2.5 User Profile Routes (routes/user.py)
Endpoints:
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile (age, gender, height, weight, activity_level)
- `PUT /api/user/goal` - Update daily calorie goal

## Acceptance Criteria
- ✅ Users can register with email/password
- ✅ Users can login/logout
- ✅ Passwords are securely hashed
- ✅ Protected routes require authentication
- ✅ User profile can be viewed and updated
- ✅ BMR calculation integrated into registration
- ✅ `@require_auth` decorator implemented
- ✅ Daily calorie goal field added to User model
- ✅ Database migrations created and applied

## Summary
All authentication features have been implemented:
- User model with profile fields and daily_calorie_goal
- Registration with BMR/TDEE calculation
- Login/logout with Flask-Login sessions
- Profile CRUD operations
- Calorie goal management endpoint
- User statistics endpoint
- Custom @require_auth decorator
- Database properly initialized with all tables
