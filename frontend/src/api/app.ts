import api from './client'

/** Metadata of the last APK published by scripts/build-android.sh. */
export interface AppRelease {
  versionCode: number
  versionName: string
  downloadPath: string
  sha256?: string
  sizeBytes?: number
  builtAt?: string
}

/**
 * Returns null when nothing has been published (the endpoint 404s on a fresh
 * checkout) — "no release" is a normal state, not an error to surface.
 */
export async function getAppRelease(): Promise<AppRelease | null> {
  try {
    const { data } = await api.get<AppRelease>('/app/version')
    return data
  } catch {
    return null
  }
}
