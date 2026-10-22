import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CopyDiarySheet from '@/components/food/CopyDiarySheet'
import { copyDiary } from '@/api/diaryCopy'
jest.mock('@/api/diaryCopy', () => ({ copyDiary: jest.fn() }))
const copy = copyDiary as jest.MockedFunction<typeof copyDiary>
const onClose = jest.fn(); const onCopied = jest.fn()
beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(global.crypto, 'randomUUID', { configurable: true, value: jest.fn(() => '12345678-1234-4123-8123-123456789012') })
})
function show(kind: 'exercise' | 'medication' | 'bowel' = 'exercise') {
  return render(<CopyDiarySheet kind={kind} sourceDate="2026-10-21" entries={[{ id: 1, label: 'Entry one' }, { id: 2, label: 'Entry two' }]} onClose={onClose} onCopied={onCopied} />)
}
function confirm() {
  fireEvent.change(screen.getByLabelText('Copy to date'), { target: { value: '2026-10-22' } })
  fireEvent.click(screen.getByLabelText(/I confirm/))
}
test('requires explicit destination/selection confirmation and preserves source ids', async () => {
  copy.mockResolvedValue({ created_count: 1, destination_date: '2026-10-22', warnings: [], replayed: false })
  show('medication')
  expect(screen.getByRole('button', { name: 'Copy 2 entries' })).toBeDisabled()
  fireEvent.click(screen.getByLabelText('Entry two'))
  confirm()
  fireEvent.click(screen.getByRole('button', { name: 'Copy 1 entry to 2026-10-22' }))
  await waitFor(() => expect(onCopied).toHaveBeenCalled())
  expect(copy).toHaveBeenCalledWith('medication', expect.objectContaining({ log_ids: [1], confirmed: true, source_date: '2026-10-21', destination_date: '2026-10-22' }))
})
test('network retry keeps request id and selection; synchronous duplicate taps are blocked', async () => {
  copy.mockRejectedValueOnce({ response: { data: { error: 'Connection lost' } } })
  copy.mockResolvedValueOnce({ created_count: 2, destination_date: '2026-10-22', warnings: [], replayed: true })
  show(); confirm()
  fireEvent.click(screen.getByRole('button', { name: 'Copy 2 entries to 2026-10-22' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost')
  fireEvent.click(screen.getByRole('button', { name: 'Copy 2 entries to 2026-10-22' }))
  await waitFor(() => expect(onCopied).toHaveBeenCalled())
  expect(copy.mock.calls[0][1].request_id).toBe(copy.mock.calls[1][1].request_id)
  expect(screen.getByLabelText('Entry one')).toBeChecked()
})
test('destination changes reset confirmation and same-date copies are blocked', () => {
  show('bowel'); confirm()
  fireEvent.change(screen.getByLabelText('Copy to date'), { target: { value: '2026-10-21' } })
  expect(screen.getByLabelText(/I confirm/)).not.toBeChecked()
  expect(screen.getByRole('button', { name: 'Copy 2 entries to 2026-10-21' })).toBeDisabled()
})
