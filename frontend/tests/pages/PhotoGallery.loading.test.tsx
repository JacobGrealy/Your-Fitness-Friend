import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PhotoGallery from '@/pages/Meals/PhotoGallery'
import { useMealsStore } from '@/store/mealsStore'
import { mealsApi } from '@/api/meals'
jest.mock('@/api/meals', () => ({ mealsApi: { getPhotos: jest.fn(async () => []), deletePhoto: jest.fn(), uploadPhoto: jest.fn() } }))
const deferred = () => { let resolve!: (value: any) => void; let reject!: (reason: any) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
beforeEach(async () => {
  await Promise.resolve()
  jest.clearAllMocks()
  useMealsStore.setState({ photos: [], error: null })
})
test('meal deletion stays pending, retains confirmation/error on failure and supports explicit retry', async () => {
  const photo = { id: '1', photo_path: 'meal.jpg', date: '2026-01-01', created_at: '2026-01-01', estimated_calories: null, estimated_protein: null } as any
  ;(mealsApi.getPhotos as jest.Mock).mockResolvedValue([photo])
  const deletion = deferred()
  ;(mealsApi.deletePhoto as jest.Mock).mockReturnValueOnce(deletion.promise).mockResolvedValueOnce({})
  render(<MemoryRouter><PhotoGallery /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Delete', exact: true }))
  const dialog = screen.getByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete', exact: true }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(within(dialog).getByRole('button', { name: 'Deleting…' })).toBeDisabled()
  expect(mealsApi.deletePhoto).toHaveBeenCalledTimes(1)
  await act(async () => deletion.reject(new Error('offline')))
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Failed to delete photo')
  expect(useMealsStore.getState().photos).toEqual([photo])
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete', exact: true }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(useMealsStore.getState().photos).toEqual([])
})
test('meal upload remains pending across refresh and another concurrent read', async () => {
  const refresh = deferred(), concurrent = deferred()
  ;(mealsApi.uploadPhoto as jest.Mock).mockResolvedValueOnce({})
  ;(mealsApi.getPhotos as jest.Mock).mockReturnValueOnce(concurrent.promise).mockReturnValueOnce(refresh.promise)
  const reading = useMealsStore.getState().fetchPhotos()
  const uploading = useMealsStore.getState().uploadPhoto(new FormData())
  await Promise.resolve(); await Promise.resolve()
  concurrent.resolve([]); await reading
  expect(useMealsStore.getState().isLoading).toBe(true)
  refresh.resolve([]); await uploading
  expect(useMealsStore.getState().isLoading).toBe(false)
})
