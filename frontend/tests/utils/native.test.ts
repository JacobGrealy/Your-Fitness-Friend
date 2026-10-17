import { resolveBackAction, dispatchBackEvent, BACK_EVENT } from '@/native'

describe('native shell back-button handling', () => {
  it('treats a claimed press as handled', () => {
    expect(resolveBackAction(true, true)).toBe('handled')
    expect(resolveBackAction(true, false)).toBe('handled')
  })

  it('pops history when nothing claimed it and there is somewhere to go', () => {
    expect(resolveBackAction(false, true)).toBe('history')
  })

  it('minimizes instead of exiting at the root screen', () => {
    expect(resolveBackAction(false, false)).toBe('minimize')
  })
})

describe('dispatchBackEvent', () => {
  afterEach(() => {
    // listeners registered by one case must not leak into the next
    document.body.innerHTML = ''
  })

  it('reports unhandled when nothing listens', () => {
    expect(dispatchBackEvent()).toBe(false)
  })

  it('reports handled when a listener calls preventDefault', () => {
    const listener = (event: Event) => event.preventDefault()
    window.addEventListener(BACK_EVENT, listener)
    expect(dispatchBackEvent()).toBe(true)
    window.removeEventListener(BACK_EVENT, listener)
  })
})
