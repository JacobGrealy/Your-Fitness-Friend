#!/bin/bash

# FitnessFriend Full-Stack Systemd Service Installer
# Installs both backend (gunicorn) and frontend (Vite dev server) as separate
# systemd services.
#
# Backend: serves the Flask API + frontend static files on port 5001
# Frontend: serves the Vite dev server on port 5173 (for development)
#
# Note: For production deployment, use install-backend-service.sh instead,
# which serves the built frontend via gunicorn on a single port.

set -e

BACKEND_SERVICE="/home/angrygiant/github_projects/FitnessFriend/fitness-backend.service"
FRONTEND_SERVICE="/home/angrygiant/github_projects/FitnessFriend/fitness-frontend.service"
SYSTEMD_DIR="/etc/systemd/system"

echo "Installing FitnessFriend systemd services..."

# Copy service files
sudo cp "$BACKEND_SERVICE" "$SYSTEMD_DIR/fitness-backend.service"
sudo cp "$FRONTEND_SERVICE" "$SYSTEMD_DIR/fitness-frontend.service"

# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable fitness-backend.service
sudo systemctl enable fitness-frontend.service

# Restart services
sudo systemctl restart fitness-backend.service
sudo systemctl restart fitness-frontend.service

# Show status
echo ""
echo "=== Backend ==="
sudo systemctl status fitness-backend.service --no-pager
echo ""
echo "=== Frontend ==="
sudo systemctl status fitness-frontend.service --no-pager

echo ""
echo "Done! FitnessFriend services are running."
echo "Backend: http://127.0.0.1:5001"
echo "Frontend: http://127.0.0.1:5173"
