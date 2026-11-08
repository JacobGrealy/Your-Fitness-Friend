import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Profile from '@/pages/Profile'
import AuthGuard from '@/components/layout/AuthGuard'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'

jest.mock('@/api/auth', () => ({ authApi: { getProfile: jest.fn(), updateProfile: jest.fn() } }))
jest.mock('@/api/weight', () => ({ weightApi: { getWeightLogs: jest.fn(async () => []) } }))
jest.mock('@/api/app', () => ({ getAppRelease: jest.fn(async () => null) }))
jest.mock('@/native', () => ({ getRunningAppVersion: jest.fn(async () => null), isUpdateAvailable: () => false }))
jest.mock('@/components/profile/RemindersCard', () => () => null)
jest.mock('@/components/profile/BadgesSection', () => () => null)
const setTitle = jest.fn()
jest.mock('@/components/layout/PageTitleContext', () => ({ usePageTitle: () => ({ setTitle }) }))
const user = { id: 1, email: 'test@example.test', daily_calorie_goal: 2000 } as any
const deferred = () => { let resolve!: (value: any) => void; let reject!: (reason: any) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
beforeEach(() => {
  jest.clearAllMocks()
  useAuthStore.setState({ user, isAuthenticated: true, isLoading: false, error: null })
})

test('profile stays mounted with its draft and scoped Saving through authenticated refresh', async () => {
  const write = deferred(), refresh = deferred()
  ;(authApi.updateProfile as jest.Mock).mockReturnValueOnce(write.promise)
  ;(authApi.getProfile as jest.Mock).mockReturnValueOnce(refresh.promise)
  render(<MemoryRouter><AuthGuard><Profile /></AuthGuard></MemoryRouter>)
  fireEvent.click(screen.getByText('Calorie Goal'))
  const input = screen.getByPlaceholderText('e.g. 2200')
  fireEvent.change(input, { target: { value: '2350' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))
  await screen.findByRole('button', { name: 'Saving…' })
  await act(async () => write.resolve({}))
  expect(authApi.getProfile).toHaveBeenCalledTimes(1)
  expect(useAuthStore.getState().isLoading).toBe(false)
  expect(screen.getByPlaceholderText('e.g. 2200')).toBe(input)
  expect(input).toHaveValue(2350)
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  await act(async () => refresh.resolve({ ...user, daily_calorie_goal: 2350 }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(authApi.updateProfile).toHaveBeenCalledTimes(1)
})

test('silent authenticated refresh still invalidates an expired session', async () => {
  ;(authApi.getProfile as jest.Mock).mockRejectedValueOnce({ response: { status: 401 } })
  await useAuthStore.getState().checkAuth()
  expect(useAuthStore.getState()).toMatchObject({ user: null, isAuthenticated: false, isLoading: false })
})

test('initial authentication remains blocking; transient authenticated refresh retains session', async () => {
  const initial = deferred()
  useAuthStore.setState({ user: null, isAuthenticated: false })
  ;(authApi.getProfile as jest.Mock).mockReturnValueOnce(initial.promise)
  const checking = useAuthStore.getState().checkAuth()
  expect(useAuthStore.getState().isLoading).toBe(true)
  initial.resolve(user); await checking
  ;(authApi.getProfile as jest.Mock).mockRejectedValueOnce(new Error('offline'))
  await useAuthStore.getState().checkAuth()
  expect(useAuthStore.getState()).toMatchObject({ user, isAuthenticated: true, isLoading: false })
})
