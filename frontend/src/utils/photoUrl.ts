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
