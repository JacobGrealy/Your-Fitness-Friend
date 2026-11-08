import type { StateCreator } from 'zustand'

/** Count complete async actions, including nested refreshes, rather than racing booleans. */
export function withPendingRequests<T extends { isLoading: boolean }>(
  creator: StateCreator<T>, keys: (keyof T)[],
): StateCreator<T> {
  return (set, get, api) => {
    let pending = 0
    const state = creator(set, get, api)
    for (const key of keys) {
      const action = state[key] as (...args: unknown[]) => Promise<unknown>
      state[key] = (async (...args: unknown[]) => {
        pending++
        set({ isLoading: true } as Partial<T>)
        try { return await action(...args) }
        finally {
          pending--
          set({ isLoading: pending > 0 } as Partial<T>)
        }
      }) as T[keyof T]
    }
    return state
  }
}
