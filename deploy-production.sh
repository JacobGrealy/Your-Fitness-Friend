#!/bin/bash

# FitnessFriend Production Build + Backend Service Installer
# Installs the backend systemd service and ensures the frontend is built first.
#
# The backend (gunicorn) serves the Flask API and the frontend static files
# from app/static/. This script runs `vite build` before deploying to ensure
# the latest frontend code is available.

set -e

APP_NAME="fitnessfriend"
APP_DIR="/home/angrygiant/github_projects/FitnessFriend"
SERVICE_FILE="$APP_DIR/${APP_NAME}.service"
SYSTEMD_DIR="/etc/systemd/system"

echo "=== Installing $APP_NAME Systemd Service ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root (sudo)"
    exit 1
fi

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "Error: App directory not found: $APP_DIR"
    exit 1
fi

# Check if start script exists
if [ ! -f "$APP_DIR/run-backend.sh" ]; then
    echo "Error: Backend script not found: $APP_DIR/run-backend.sh"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "$APP_DIR/venv" ]; then
    echo "Error: Virtual environment not found: $APP_DIR/venv"
    exit 1
fi

# Check if frontend exists
if [ ! -d "$APP_DIR/frontend" ]; then
    echo "Error: Frontend directory not found: $APP_DIR/frontend"
    echo "Run ./bootstrap-frontend.sh to set up the frontend first."
    exit 1
fi

# Build frontend
echo "=== Building Frontend ==="
NODE_BIN="/home/angrygiant/.nvm/versions/node/v22.22.2/bin/node"

if [ ! -f "$APP_DIR/frontend/node_modules/.bin/vite" ]; then
    echo "Node modules not installed. Running npm install..."
    cd "$APP_DIR/frontend"
    npm install
fi

echo "Running vite build..."
cd "$APP_DIR/frontend"
$NODE_BIN node_modules/vite/bin/vite.js build 2>&1

if [ $? -ne 0 ]; then
    echo "Error: Frontend build failed. Aborting."
    exit 1
fi

echo "Frontend build complete."
echo ""

# Copy service file
echo "1. Copying service file to $SYSTEMD_DIR..."
cp "$SERVICE_FILE" "$SYSTEMD_DIR/"

# Reload systemd daemon
echo "2. Reloading systemd daemon..."
systemctl daemon-reload

# Enable service to start on boot
echo "3. Enabling service to start on boot..."
systemctl enable "$APP_NAME"

# Start the service
echo "4. Starting service..."
systemctl restart "$APP_NAME"

# Check service status
echo ""
echo "=== Service Status ==="
systemctl status "$APP_NAME" --no-pager

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Service Name: $APP_NAME"
echo "Working Directory: $APP_DIR"
echo "Access URL: http://localhost:5001"
echo ""
echo "Useful commands:"
echo "  Status:    sudo systemctl status $APP_NAME"
echo "  Start:     sudo systemctl start $APP_NAME"
echo "  Stop:      sudo systemctl stop $APP_NAME"
echo "  Restart:   sudo systemctl restart $APP_NAME"
echo "  Logs:      sudo journalctl -u $APP_NAME -f"
echo "  Disable:   sudo systemctl disable $APP_NAME"
