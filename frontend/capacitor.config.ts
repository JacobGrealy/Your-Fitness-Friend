import type { CapacitorConfig } from '@capacitor/cli';

/**
 * AweFit — thin Android client.
 *
 * The WebView loads the real app from the owner's server instead of a bundled
 * copy. That keeps one origin, which is what makes Flask-Login's session cookie,
 * CORS, /uploads and every relative photo URL work unchanged. See
 * docs/autonomy/DECISIONS.md ("Android app shape") for why this beat a TWA and
 * a bundled SPA.
 *
 * Build with an explicit server:
 *   ANDROID_SERVER_URL=http://192.168.0.224:5001 npm run android:sync
 *
 * The default is the Tailscale address because the LAN address is DHCP and moves.
 * FF-0008 replaces it with https://home-server-1.tail96ee52.ts.net.
 */
const serverUrl = process.env.ANDROID_SERVER_URL || 'http://100.84.29.20:5001';
const isCleartext = serverUrl.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'dev.awefit.app',
  appName: 'AweFit',
  // The Vite build writes here (frontend/vite.config.ts -> '../app/static').
  webDir: '../app/static',
  android: {
    // Matches <meta name="theme-color"> in index.html so there is no flash of
    // white between the splash and the first paint.
    backgroundColor: '#1a1a1a',
  },
  server: {
    url: serverUrl,
    // Android blocks cleartext HTTP from API 28 on; this only opens it for the
    // app, and only while the server is actually served over plain HTTP.
    cleartext: isCleartext,
  },
};

export default config;
