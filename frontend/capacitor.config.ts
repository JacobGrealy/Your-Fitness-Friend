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
 * The default is the Tailscale HTTPS name (FF-0008): it is stable, it is publicly
 * trusted by Let's Encrypt so the WebView needs no certificate exception, and —
 * unlike the plain-HTTP LAN or Tailscale *IP* — it is a secure context, which is
 * what the camera scanner needs. The LAN address stays available for testing but
 * is DHCP and changes; pass it explicitly.
 */
const DEFAULT_SERVER_URL = 'https://home-server-1.tail96ee52.ts.net';
const serverUrl = process.env.ANDROID_SERVER_URL || DEFAULT_SERVER_URL;
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
  plugins: {
    // Capacitor 8 folds status-bar and edge-to-edge handling into SystemBars.
    // 'css' keeps the native side honest about the insets *and* exposes them as
    // --safe-area-inset-* variables; the viewport-fit hint stops the layout
    // jumping on first paint, before the WebView reports the real value.
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#1a1a1a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  server: {
    url: serverUrl,
    // Android blocks cleartext HTTP from API 28 on; this only opens it for the
    // app, and only while the server is actually served over plain HTTP.
    cleartext: isCleartext,
  },
};

export default config;
