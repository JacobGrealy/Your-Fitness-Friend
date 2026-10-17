import { installApkUpdate } from '@/native'

// FF-0044: the update button downloads and starts the installer in one tap, and
// falls back to the browser rather than dead-ending when the native path cannot
// run (web, a missing plugin, a refused install permission).

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => true),
    registerPlugin: jest.fn(),
    getPlatform: () => 'android',
  },
  registerPlugin: jest.fn(),
}))

jest.mock('@capacitor/browser', () => ({ Browser: { open: jest.fn() } }))
jest.mock('@capacitor/app', () => ({ App: { getInfo: jest.fn(), addListener: jest.fn() } }))
jest.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: jest.fn() } }))
jest.mock('@capacitor/status-bar', () => ({ StatusBar: { setStyle: jest.fn() }, Style: { Dark: 'DARK' } }))

const core = jest.requireMock('@capacitor/core')
const browser = jest.requireMock('@capacitor/browser')

const install = jest.fn()
const URL = 'https://home-server-1.tail96ee52.ts.net/download/awefit.apk'

describe('installApkUpdate (FF-0044)', () => {
  beforeEach(() => {
    install.mockReset()
    core.registerPlugin.mockReset().mockReturnValue({ install })
    core.Capacitor.isNativePlatform.mockReturnValue(true)
    browser.Browser.open.mockReset().mockResolvedValue(undefined)
    Object.defineProperty(window, 'open', { writable: true, value: jest.fn() })
  })

  it('hands the APK to the native installer in the app', async () => {
    install.mockResolvedValue({ started: true, path: '/cache/awefit-update.apk' })

    await expect(installApkUpdate(URL)).resolves.toBe('installing')
    expect(install).toHaveBeenCalledWith({ url: URL })
    expect(browser.Browser.open).not.toHaveBeenCalled()
  })

  it('says when the install permission is missing, and opens no browser', async () => {
    install.mockRejectedValue(
      new Error('AweFit needs permission to install apps. install_permission_required')
    )

    await expect(installApkUpdate(URL)).resolves.toBe('permission-required')
    expect(browser.Browser.open).not.toHaveBeenCalled()
  })

  it('falls back to the browser when the native path fails for any other reason', async () => {
    install.mockRejectedValue(new Error('download failed: HTTP 404'))

    await expect(installApkUpdate(URL)).resolves.toBe('browser')
    expect(browser.Browser.open).toHaveBeenCalledWith({ url: URL })
  })

  it('falls back to the browser when the plugin is absent', async () => {
    core.registerPlugin.mockImplementation(() => {
      throw new Error('ApkInstaller is not implemented on android')
    })

    await expect(installApkUpdate(URL)).resolves.toBe('browser')
    expect(browser.Browser.open).toHaveBeenCalledWith({ url: URL })
  })

  it('opens a tab instead of installing when running in a browser', async () => {
    core.Capacitor.isNativePlatform.mockReturnValue(false)

    await expect(installApkUpdate(URL)).resolves.toBe('browser')
    expect(install).not.toHaveBeenCalled()
    expect(window.open).toHaveBeenCalledWith(URL, '_blank', 'noopener')
  })
})
