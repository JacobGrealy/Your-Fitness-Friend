import { render, screen, fireEvent } from '@testing-library/react'
import DiaryDateSelector, { formatDateLabel } from '@/components/food/DiaryDateSelector'

// FF-0019: the diary date control now has one implementation used twice (mobile
// top bar + inline for wide layouts, where the mobile header is hidden).

const TODAY = new Date('2026-10-17T12:00:00')

describe('DiaryDateSelector', () => {
  it('labels today as "Today" and other days by date', () => {
    jest.useFakeTimers().setSystemTime(TODAY)
    expect(formatDateLabel(new Date())).toBe('Today')
    expect(formatDateLabel(new Date('2026-10-14T12:00:00'))).toBe('Oct 14')
    jest.useRealTimers()
  })

  it('steps back a day', () => {
    const onChange = jest.fn()
    render(<DiaryDateSelector date={TODAY} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Previous day'))

    const next = onChange.mock.calls[0][0] as Date
    expect(next.getDate()).toBe(16)
  })

  it('jumps back to today from the label', () => {
    const onChange = jest.fn()
    render(<DiaryDateSelector date={new Date('2026-10-14T12:00:00')} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Jump to today'))

    expect(onChange).toHaveBeenCalled()
    const picked = onChange.mock.calls[0][0] as Date
    expect(Math.abs(picked.getTime() - Date.now())).toBeLessThan(5000)
  })

  it('will not step into the future', () => {
    const onChange = jest.fn()
    jest.useFakeTimers().setSystemTime(TODAY)
    render(<DiaryDateSelector date={new Date()} onChange={onChange} />)

    expect(screen.getByLabelText('Next day')).toBeDisabled()
    jest.useRealTimers()
  })

  it('renders in both variants', () => {
    const { unmount } = render(<DiaryDateSelector date={TODAY} onChange={jest.fn()} variant="header" />)
    expect(screen.getByLabelText('Previous day')).toBeInTheDocument()
    unmount()

    render(<DiaryDateSelector date={TODAY} onChange={jest.fn()} variant="inline" />)
    expect(screen.getByLabelText('Previous day')).toBeInTheDocument()
  })
})
