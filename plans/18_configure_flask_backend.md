# Plan: Configure Flask Backend for React

## Overview
Update Flask backend to serve the React PWA build.

## Tasks

### 1. Update app/__init__.py
- Add SPA catch-all route after all API routes
- Import send_from_directory from flask
- Add route that serves index.html for all non-API paths
- Ensure API routes take precedence
- Configure static folder path

### 2. Update app/config.py
- Add FRONTEND_BUILD_PATH config option
- Set default to 'static'
- Document configuration

### 3. Create Flask Route Handler
- Add route for root path (/)
- Add route for all other paths except /api/*
- Serve app/static/index.html
- Return 404 for non-existent files

### 4. Configure Static File Serving
- Ensure uploads folder is accessible
- Configure CORS if needed
- Set proper MIME types

### 5. Update .env.example
- Add VITE_API_URL documentation
- Document environment variables

## Expected Outcome
- Flask serves React build
- SPA routing works correctly
- API routes still functional
- Static files accessible

## Notes
- Order matters: API routes before SPA catch-all
- Test both API and frontend routes
- Ensure proper error handling
- Configure for production environment