/**
 * Photo URLs for weight uploads (FF-0074).
 *
 * The serve route accepts both the stored form (`weight_photos/x.jpg`) and a bare
 * filename, so the value goes through unchanged. This existed as three hand-rolled
 * copies in EditWeight, ThenAndNow and WeightTimelapse; four is where it drifts.
 */
export function weightPhotoUrl(photoUrl: string): string {
  return `${window.location.origin}/api/weight/uploads/${photoUrl}`
}

/**
 * Photo URLs for food-log photos (FF-0087).
 *
 * Same shape as weightPhotoUrl; the serve route accepts the stored path unchanged.
 */
export function foodLogPhotoUrl(photoUrl: string): string {
  return `${window.location.origin}/api/food/uploads/${photoUrl}`
}

/** Derivatives only for our image endpoints, never external or temporary URLs. */
export function thumbnailUrl(original: string): string {
  try {
    const url = new URL(original, window.location.origin)
    if (url.origin !== window.location.origin || !/^\/api\/(?:food\/uploads\/|weight\/uploads\/|auth\/uploads\/|exercise\/log\/[^/]+\/photo$)/.test(url.pathname)) return original
    url.searchParams.set('thumbnail', '1')
    return /^https?:\/\//.test(original) ? url.toString() : `${url.pathname}${url.search}${url.hash}`
  } catch { return original }
}
