import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * Native shell glue for AweFit. Everything here is a no-op in a browser, so the
 * same bundle serves the web app and the APK.
 */

/** What a hardware back press should do, in priority order. */
export type BackAction = 'handled' | 'history' | 'minimize'

/**
 * The back button is the one control Android gives us for free, and getting it
 * wrong is the most obvious "this is a web page in a box" tell: pressing back
 * with a sheet open should close the sheet, not silently leave the screen.
 *
 * `handled` — a listener called preventDefault on the back event (a modal closed)
 * `history` — there is somewhere to go in the SPA history
 * `minimize`— root screen: behave like the home button instead of killing the app
 */
export function resolveBackAction(handled: boolean, canGoBack: boolean): BackAction {
  if (handled) return 'handled'
  if (canGoBack) return 'history'
  return 'minimize'
}

/** Event any overlay can cancel to claim the back press. */
export const BACK_EVENT = 'awefit:back'

/** Returns true when something on the page claimed the back press. */
export function dispatchBackEvent(): boolean {
  const event = new CustomEvent(BACK_EVENT, { cancelable: true })
  return !window.dispatchEvent(event)
}

/**
 * Wire the native shell. Safe to call unconditionally from main.tsx.
 */
export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    // Light status-bar content: the header behind it is brand blue.
    await StatusBar.setStyle({ style: Style.Light })
  } catch {
    /* status bar is best-effort; a failure must not block the app */
  }

  CapacitorApp.addListener('backButton', () => {
    const handled = dispatchBackEvent()
    const action = resolveBackAction(handled, window.history.length > 1)
    if (action === 'history') {
      window.history.back()
    } else if (action === 'minimize') {
      void CapacitorApp.minimizeApp()
    }
  })

  try {
    await SplashScreen.hide()
  } catch {
    /* the splash auto-hides anyway */
  }
}
