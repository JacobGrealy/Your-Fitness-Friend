# Plan: Configure Vite + PWA

## Overview
Set up Vite configuration with PWA plugin for offline support and installability.

## Tasks

### 1. Create vite.config.ts
- Import react plugin from @vitejs/plugin-react
- Import VitePWA from vite-plugin-pwa
- Configure plugins array with react() and VitePWA()
- Set up server proxy for API requests:
  - /api → http://localhost:5000
  - /auth → http://localhost:5000
  - /uploads → http://localhost:5000
- Configure build output directory to ../app/static
- Set emptyOutDir to true to clean previous builds

### 2. Configure PWA Options
- registerType: 'autoUpdate'
- includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.svg']
- Configure manifest:
  - name: 'FitnessFriend'
  - short_name: 'FitnessFriend'
  - description: 'Track your fitness journey'
  - theme_color: '#2c3e50'
  - background_color: '#ffffff'
  - display: 'standalone'
  - icons array with 192x192 and 512x512 PNG icons

### 3. Create public/manifest.json (if not using plugin)
- App name and short name
- Theme colors
- Display mode
- Icon references

### 4. Create Icon Files
- Generate 192x192 PNG icon
- Generate 512x512 PNG icon
- Place in public/icons/ directory
- Ensure consistent branding with app theme

### 5. Create public/robots.txt
- Allow all crawlers
- Reference sitemap if needed

### 6. Test PWA Configuration
- Run dev server
- Check that service worker registers
- Verify manifest is loaded
- Test PWA install prompt on mobile
- Verify offline caching works

## Expected Outcome
- Vite configured with React and PWA plugins
- PWA manifest properly configured
- Service worker registered and caching assets
- App installable on mobile devices
- Build output directed to Flask static folder

## Notes
- vite-plugin-pwa handles service worker generation
- Proxy configuration allows local development without CORS issues
- Build output to app/static enables Flask serving
- Test on real mobile devices for PWA functionality