import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import CompleteDiaryModal from '@/components/food/CompleteDiaryModal'
import type { DiaryCompletionSummary } from '@/api/diary'

// FF-0054: the day's report card. The projection is only shown when the API
// supplies one, and the reason replaces it when the API withholds it.

const base: DiaryCompletionSummary = {
  date: '2026-10-17',
  completed: true,
  completed_at: '2026-10-17T20:00:00',
  totals: { calories: 2100, protein_g: 150, carbs_g: 200, fat_g: 70, log_count: 5 },
  goal_calories: 2200,
  maintenance_calories: 2600,
  status: 'ok',
  projection: {
    days: 35,
    change_lbs: -5,
    projected_weight_lbs: 171.3,
    start_weight_lbs: 176.3,
  },
  streak: 4,
  message: 'Based on this day, repeated for five weeks.',
}

const renderModal = (overrides: Partial<DiaryCompletionSummary> = {}) =>
  render(
    <CompleteDiaryModal
      summary={{ ...base, ...overrides }}
      onClose={jest.fn()}
      onUndo={jest.fn()}
    />
  )

describe('CompleteDiaryModal (FF-0054)', () => {
  it("shows the day's totals and the calorie goal", () => {
    renderModal()
    expect(screen.getByText('2,100')).toBeInTheDocument()
    expect(screen.getByText('2,100 of 2,200 calorie goal')).toBeInTheDocument()
    expect(screen.getByText('150g')).toBeInTheDocument()
  })

  it('frames the projection as five weeks of days like this one', () => {
    renderModal()
    expect(screen.getByText('In 5 weeks')).toBeInTheDocument()
    expect(screen.getByText(/5 lb/)).toBeInTheDocument()
    expect(screen.getByText('If every day were like this one.')).toBeInTheDocument()
    expect(screen.getByText('171.3 lb from 176.3 lb')).toBeInTheDocument()
  })

  it('shows a gain as a gain rather than losing the sign', () => {
    renderModal({
      projection: { days: 35, change_lbs: 2.5, projected_weight_lbs: 178.8, start_weight_lbs: 176.3 },
    })
    expect(screen.getByText(/↑ 2\.5 lb/)).toBeInTheDocument()
  })

  it('withholds the projection and explains why when intake is too low', () => {
    renderModal({
      status: 'too_low',
      projection: { days: 35, change_lbs: null, projected_weight_lbs: null, start_weight_lbs: 176.3 },
      message: 'This is under the intake most people need. No weight projection is shown for a day like this.',
    })
    expect(screen.queryByText('In 5 weeks')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/under the intake most people need/)
  })

  it('warns without hiding the projection for a borderline day', () => {
    renderModal({
      status: 'under_eating',
      message: 'Heads up: this is on the low side for a full day.',
    })
    expect(screen.getByText('In 5 weeks')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/on the low side/)
  })

  it('explains an empty diary instead of projecting', () => {
    renderModal({
      status: 'empty',
      totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, log_count: 0 },
      projection: { days: 35, change_lbs: null, projected_weight_lbs: null, start_weight_lbs: 176.3 },
      message: 'Log something for this day first — there is nothing to project yet.',
    })
    expect(screen.queryByText('In 5 weeks')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/nothing to project/)
  })

  it('shows the completed streak only once it is worth mentioning', () => {
    renderModal({ streak: 4 })
    expect(screen.getByText(/4 days in a row/)).toBeInTheDocument()
    cleanup()
    renderModal({ streak: 1 })
    expect(screen.queryByText(/days in a row/)).not.toBeInTheDocument()
  })

  it('offers undo and done, wired to their handlers', () => {
    const onClose = jest.fn()
    const onUndo = jest.fn()
    render(<CompleteDiaryModal summary={base} onClose={onClose} onUndo={onUndo} />)

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onUndo).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalled()
  })
})
