/**
 * Where to go after finishing an add (FF-0021).
 *
 * The add flow is two screens deep (Add Food → serving/Quick Add), and it used to
 * end on a hardcoded `navigate('/food/log')` — finishing a quick add dumped you on
 * the search screen instead of where you started. The origin is carried through
 * the flow in router location state, so each screen just forwards it.
 */

/** Paths that are part of the add flow itself; returning to one would loop. */
const ADD_FLOW_PREFIXES = ['/food/log', '/food/photo-log', '/food/barcode']

/** Where to land when the origin is unknown: the app's home. */
export const FALLBACK_RETURN = '/dashboard'

export interface ReturnState {
  returnTo?: string
}

/**
 * A usable return path from router location state, or the fallback.
 *
 * Anything that is not an in-app absolute path, and anything inside the add flow,
 * is rejected: a bad value here would either bounce the user straight back into
 * the form or leave the app.
 */
export function resolveReturnTo(state: unknown, fallback: string = FALLBACK_RETURN): string {
  const candidate = (state as ReturnState | null | undefined)?.returnTo
  if (typeof candidate !== 'string') return fallback
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback
  if (ADD_FLOW_PREFIXES.some((prefix) => candidate === prefix || candidate.startsWith(prefix + '?') || candidate.startsWith(prefix + '/'))) {
    return fallback
  }
  return candidate
}

/** Location state that tells the add flow to come back to `path`. */
export function returnState(path: string): ReturnState {
  return { returnTo: path }
}
