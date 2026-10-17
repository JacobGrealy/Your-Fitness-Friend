import { Capacitor, registerPlugin } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
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

/** The running build's versionCode, or null outside the native shell. */
export async function getRunningAppVersion(): Promise<{ build: number; version: string } | null> {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const info = await CapacitorApp.getInfo()
    return { build: Number.parseInt(info.build, 10) || 0, version: info.version }
  } catch {
    return null
  }
}

/**
 * A newer published build is only "available" when both numbers are known: on
 * the web there is no installed build, and with nothing published there is
 * nothing to offer.
 */
export function isUpdateAvailable(runningBuild: number | null, publishedVersionCode: number | null | undefined): boolean {
  if (runningBuild === null || publishedVersionCode === null || publishedVersionCode === undefined) return false
  return publishedVersionCode > runningBuild
}

/**
 * Hand a URL to the system instead of the WebView. An APK link inside a WebView
 * does nothing at all — Android only downloads it from a real browser — so the
 * update download has to leave the app. A Custom Tab is still the user's own
 * browser, so the download and the install prompt behave normally.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
    return
  }
  window.open(url, '_blank', 'noopener')
}

interface ApkInstallerPlugin {
  install(options: { url: string }): Promise<{ started: boolean; path: string }>
}

/**
 * One-tap update (FF-0044).
 *
 * Inside the Android shell this goes through the local `ApkInstaller` plugin: it
 * downloads the APK off the UI thread and fires the system installer, so the user
 * taps Update once instead of finding the download and opening it themselves. The
 * install dialog is still Android's — an app cannot replace itself silently.
 *
 * Every failure falls back to the browser path rather than dead-ending: a Custom
 * Tab download is worse than one tap but far better than a button that does
 * nothing. `install_permission_required` is the one case worth saying out loud,
 * because the fix is a switch the user has to flip once.
 */
export type UpdateInstallOutcome = 'installing' | 'browser' | 'permission-required'

export async function installApkUpdate(url: string): Promise<UpdateInstallOutcome> {
  if (!Capacitor.isNativePlatform()) {
    await openExternalUrl(url)
    return 'browser'
  }

  try {
    const installer = registerPlugin<ApkInstallerPlugin>('ApkInstaller')
    await installer.install({ url })
    return 'installing'
  } catch (error: any) {
    const message = String(error?.message ?? '')
    if (message.includes('permission') || message.includes('install_permission_required')) {
      // The plugin has already opened the "install unknown apps" screen.
      return 'permission-required'
    }
    await openExternalUrl(url)
    return 'browser'
  }
}
