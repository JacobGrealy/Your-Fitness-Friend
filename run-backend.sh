#!/bin/bash

# FitnessFriend Backend Runner
# Starts gunicorn to serve the Flask API and frontend static files.
# Used by systemd (fitnessfriend.service) or run directly: ./run-backend.sh

# Restore PATH (systemd runs with minimal PATH)
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Load environment variables from .env file (if it exists)
if [ -f "$(dirname "$0")/.env" ]; then
    set -a
    source "$(dirname "$0")/.env"
    set +a
fi

# Set environment variables
export FLASK_ENV=production
export SECRET_KEY="${SECRET_KEY:-your-production-secret-key}"
export DATABASE_URL="${DATABASE_URL:-sqlite:///fitness_friend.db}"

# Create logs directory if it doesn't exist
[ -d logs ] || /bin/mkdir logs

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