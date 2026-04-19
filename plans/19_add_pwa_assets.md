# Plan: Add PWA Assets and Configuration

## Overview
Add PWA manifest, icons, and related assets.

## Tasks

### 1. Create public/manifest.json
- App name: "FitnessFriend"
- Short name: "FitnessFriend"
- Description: "Track your fitness journey"
- Theme color: #2c3e50
- Background color: #ffffff
- Display: standalone
- Start URL: /
- Icons array with 192x192 and 512x512 PNG references

### 2. Generate App Icons
- Create 192x192 PNG icon
- Create 512x512 PNG icon
- Place in public/icons/ directory
- Ensure consistent branding with app theme
- Consider using a tool like Favicon Generator

### 3. Create public/robots.txt
- Allow all crawlers: User-agent: *
- Disallow: none
- Add sitemap reference if needed

### 4. Create public/sw.js (if not using plugin)
- Service worker script for caching
- Cache app shell on install
- Runtime caching for API responses
- Offline fallback page

### 5. Update vite.config.ts
- Verify PWA plugin configuration
- Ensure manifest settings match
- Verify asset inclusion

### 6. Test PWA Installation
- Test on Android Chrome
- Verify install prompt appears
- Test offline functionality
- Verify app launches in standalone mode

## Expected Outcome
- PWA manifest properly configured
- App icons generated
- Robots.txt configured
- PWA installable on mobile devices
- Offline support working

## Notes
- Icons should be high quality
- Theme color should match app branding
- Test PWA on multiple devices
- Ensure HTTPS in production