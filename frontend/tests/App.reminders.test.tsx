import { render } from '@testing-library/react'
import App from '@/App'

let state = { isLoading: false, isAuthenticated: true, user: { id: 7 } as {id:number} | null }
const start = jest.fn()
const stop = jest.fn()
const clear = jest.fn(async () => undefined)
jest.mock('@/router', () => ({router:{}}))
jest.mock('react-router-dom', () => ({RouterProvider: () => null}))
jest.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign((selector: (value: typeof state) => unknown) => selector(state), {
    getState: () => ({checkAuth: jest.fn()}),
  }),
}))
jest.mock('@/reminderLifecycle', () => ({startReminderSync: (...args: unknown[]) => start(...args)}))
jest.mock('@/notifications', () => ({clearReminders: () => clear()}))
beforeEach(() => {
  jest.clearAllMocks()
  state = {isLoading:false,isAuthenticated:true,user:{id:7}}
  start.mockReturnValue(stop)
})

it('starts reconciliation for the authenticated account and clears it on logout', () => {
  const view = render(<App />)
  expect(start).toHaveBeenCalledWith('7')
  state = {...state,isAuthenticated:false,user:null}
  view.rerender(<App />)
  expect(stop).toHaveBeenCalled()
  expect(clear).toHaveBeenCalled()
})

it('switching accounts clears old alarms before attaching the new account', () => {
  const view = render(<App />)
  state = {...state,user:{id:8}}
  view.rerender(<App />)
  expect(clear).toHaveBeenCalledTimes(1)
  expect(start).toHaveBeenLastCalledWith('8')
})

it('does not erase persisted reminders merely because startup has not authenticated yet', () => {
  state = {isLoading:true,isAuthenticated:false,user:null}
  render(<App />)
  expect(start).not.toHaveBeenCalled()
  expect(clear).not.toHaveBeenCalled()
})
