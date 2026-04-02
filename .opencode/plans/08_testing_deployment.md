# Plan 8: Testing & Deployment

## Objective
Create tests and prepare for deployment.

## Tasks

### 8.1 Test Structure
Create `tests/` directory:
- `test_models.py` - Model validation tests
- `test_routes.py` - API endpoint tests
- `test_utils.py` - Utility function tests
- `conftest.py` - Pytest fixtures and test client setup

### 8.2 Test Coverage

**Model Tests:**
- User registration with validation
- Weight log creation and retrieval
- Exercise log with AI estimation
- Food CRUD operations
- Food log aggregation

**Route Tests:**
- Authentication endpoints (register, login, logout)
- Protected routes require auth
- Weight tracking endpoints
- Exercise tracking endpoints
- Food database endpoints
- Meal photo upload

**Utility Tests:**
- BMR calculation
- Macro goal calculation
- Qwen client error handling

### 8.3 Test Fixtures
- Test user
- Test database (sqlite in-memory)
- Mock Qwen client

### 8.4 Deployment Configuration

**Procfile** (for Heroku/Cloud):
```
web: gunicorn app:app
```

**environment variables:**
- FLASK_ENV (production/development)
- SECRET_KEY
- DATABASE_URL
- QWEN_BASE_URL
- QWEN_API_KEY

### 8.5 Production Setup
- Use gunicorn for WSGI server
- Configure CORS for frontend
- Set up logging
- Configure error handling

### 8.6 API Documentation
Create `docs/api.md` with:
- Base URL
- Authentication
- All endpoints with request/response examples
- Error codes

## Acceptance Criteria
- All routes have tests
- Model validation is tested
- Qwen client error cases are tested
- Tests run successfully
- API documentation complete
- Deployment configuration ready
