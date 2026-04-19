#!/bin/bash

# FitnessFriend Systemd Installation Script
# Run this script with sudo: sudo ./install-service.sh

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
if [ ! -f "$APP_DIR/start.sh" ]; then
    echo "Error: Start script not found: $APP_DIR/start.sh"
    echo "Please run ./start.sh first to create it."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "$APP_DIR/venv" ]; then
    echo "Error: Virtual environment not found: $APP_DIR/venv"
    exit 1
fi

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
systemctl start "$APP_NAME"

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
