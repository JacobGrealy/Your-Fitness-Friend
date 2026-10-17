#!/bin/bash

# FitnessFriend Dev Frontend Installer
#
# Installs the Vite dev server (:5173) as a systemd service. Vite proxies /api
# and /uploads to the backend on :5001, so there is no separate dev backend to
# install - the production gunicorn unit already provides the API.
#
# For production (build the frontend, install and restart the gunicorn unit),
# use deploy-production.sh instead.

set -e

APP_DIR="/home/angrygiant/github_projects/FitnessFriend"
FRONTEND_SERVICE="$APP_DIR/fitness-frontend.service"
SYSTEMD_DIR="/etc/systemd/system"

echo "Installing the FitnessFriend dev frontend service..."
echo ""

# The dev frontend proxies to the backend, so it is useless without it
if [ "$(systemctl is-active fitnessfriend.service 2>/dev/null)" != "active" ]; then
    echo "WARNING: fitnessfriend.service is not active."
    echo "         http://localhost:5173 proxies /api and /uploads to"
    echo "         http://localhost:5001, so the backend has to be running."
    echo "         Install it with:  sudo ./deploy-production.sh"
    echo ""
fi

sudo cp "$FRONTEND_SERVICE" "$SYSTEMD_DIR/fitness-frontend.service"
sudo systemctl daemon-reload
sudo systemctl enable fitness-frontend.service
sudo systemctl restart fitness-frontend.service

echo ""
echo "=== Frontend ==="
sudo systemctl status fitness-frontend.service --no-pager

# This script used to also install fitness-backend.service, a Flask dev server on
# the same port as production. It lost the port race on every boot and
# crash-looped (~377,000 restarts). It is no longer part of this repo; if an
# older copy is still installed, point the user at it rather than touching it.
if systemctl list-unit-files fitness-backend.service 2>/dev/null | grep -q fitness-backend; then
    echo ""
    echo "WARNING: a legacy fitness-backend.service is still installed on this host."
    echo "         It duplicates the production backend on port 5001 and crash-loops"
    echo "         whenever it is enabled. Remove it with:"
    echo "             sudo systemctl disable --now fitness-backend.service"
    echo "             sudo rm $SYSTEMD_DIR/fitness-backend.service"
    echo "             sudo systemctl daemon-reload"
fi

echo ""
echo "Done! Dev frontend running."
echo "Frontend: http://localhost:5173  (proxies /api and /uploads to :5001)"
