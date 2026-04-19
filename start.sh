#!/bin/bash

# FitnessFriend Start Script
# Used by systemd to start the application

# Set environment variables
export FLASK_ENV=production
export SECRET_KEY="${SECRET_KEY:-your-production-secret-key}"
export DATABASE_URL="sqlite:///fitness_friend.db"

# Create logs directory if it doesn't exist
[ -d logs ] || mkdir logs

# Start Gunicorn with production settings using venv python directly
exec /home/angrygiant/github_projects/FitnessFriend/venv/bin/gunicorn \
    --bind 0.0.0.0:5001 \
    --workers 2 \
    --threads 2 \
    --timeout 120 \
    --access-logfile logs/access.log \
    --error-logfile logs/error.log \
    --log-level info \
    "app:create_app()"