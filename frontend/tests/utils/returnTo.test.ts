import { resolveReturnTo, returnState, FALLBACK_RETURN } from '@/utils/returnTo'

describe('add-flow return target (FF-0021)', () => {
  it('returns to the page the flow was entered from', () => {
    expect(resolveReturnTo(returnState('/food/daily'))).toBe('/food/daily')
    expect(resolveReturnTo({ returnTo: '/dashboard' })).toBe('/dashboard')
  })

  it('falls back to home when nothing was recorded', () => {
    expect(resolveReturnTo(null)).toBe(FALLBACK_RETURN)
    expect(resolveReturnTo(undefined)).toBe(FALLBACK_RETURN)
    expect(resolveReturnTo({})).toBe(FALLBACK_RETURN)
    expect(resolveReturnTo({ returnTo: 42 })).toBe(FALLBACK_RETURN)
  })

  it('never returns into the add flow itself', () => {
    for (const path of ['/food/log', '/food/log/select', '/food/log/select/7', '/food/log?meal=lunch', '/food/photo-log', '/food/barcode']) {
      expect(resolveReturnTo({ returnTo: path })).toBe(FALLBACK_RETURN)
    }
  })

  it('rejects anything that is not an in-app path', () => {
    expect(resolveReturnTo({ returnTo: 'https://example.com' })).toBe(FALLBACK_RETURN)
    expect(resolveReturnTo({ returnTo: '//evil.example' })).toBe(FALLBACK_RETURN)
    expect(resolveReturnTo({ returnTo: 'food/daily' })).toBe(FALLBACK_RETURN)
  })
})
