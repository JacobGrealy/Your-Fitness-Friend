# Plan 1: Project Setup

## Objective
Initialize Flask project structure with dependencies and configuration.

## Tasks

### 1.1 Install Dependencies
Create `requirements.txt` with:
- Flask
- Flask-Login
- Flask-SQLAlchemy
- Flask-Migrate
- Werkzeug
- openai (for Qwen API)
- Flask-CORS

### 1.2 Project Structure
```
/app
  __init__.py
  config.py
  /models
    __init__.py
    user.py
    weight_log.py
    exercise_log.py
    saved_exercise.py
    food.py
    food_log.py
    meal_photo.py
  /routes
    __init__.py
    auth.py
    weight.py
    exercise.py
    food.py
    meals.py
    user.py
    dashboard.py
  /utils
    __init__.py
    qwen_client.py
    bmr_calculator.py
  /static
  /templates
  /uploads
```

### 1.3 Configuration
Create `config.py` with:
- SQLite database URI
- Secret key
- Qwen API base_url and API key
- Upload folder path
- Max file size for uploads

### 1.4 Initialize Flask App
Create `app/__init__.py` with:
- Flask app factory
- Database initialization
- Migrate initialization
- Login manager setup
- Blueprint registration

### 1.5 Database Migrations
Initialize Flask-Migrate:
- `flask db init`
- `flask db migrate -m "Initial migration"`
- `flask db upgrade`

## Acceptance Criteria
- Project structure created
- All dependencies installable via requirements.txt
- Flask app initializes without errors
- Database migrations run successfully
