import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CopyMealSheet from '@/components/food/CopyMealSheet'

// FF-0082: copy a meal from the meal itself, defaulting to today and the source meal type.

describe('CopyMealSheet (FF-0082)', () => {
  const renderSheet = (props: Partial<React.ComponentProps<typeof CopyMealSheet>> = {}) =>
    render(
      <CopyMealSheet
        isOpen
        onClose={jest.fn()}
        fromMeal="breakfast"
        fromDate="2026-10-17"
        itemCount={3}
        onCopy={jest.fn(async () => {})}
        {...props}
      />
    )

  it('defaults to the source meal and today', () => {
    renderSheet()

    expect(screen.getByRole('dialog', { name: 'Copy Breakfast' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Breakfast' })).toHaveStyle({ background: '#185ADB' })
    const today = new Date()
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect((screen.getByLabelText('Copy to date') as HTMLInputElement).value).toBe(expected)
  })

  it('says how many items will move', () => {
    renderSheet()
    expect(screen.getByText('3 items')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy 3 items to breakfast/i })).toBeInTheDocument()
  })

  it('copies to the chosen date and meal', async () => {
    const onCopy = jest.fn(async () => {})
    renderSheet({ onCopy })

    fireEvent.change(screen.getByLabelText('Copy to date'), { target: { value: '2026-10-20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lunch' }))
    fireEvent.click(screen.getByRole('button', { name: /copy 3 items to lunch/i }))

    await waitFor(() => expect(onCopy).toHaveBeenCalledWith('2026-10-20', 'lunch'))
  })

  it('warns when the destination is where the meal already is', () => {
    renderSheet({ fromDate: '2026-10-17' })
    fireEvent.change(screen.getByLabelText('Copy to date'), { target: { value: '2026-10-17' } })

    // same date + same meal = appending a second copy
    expect(screen.getByText(/will be added again/i)).toBeInTheDocument()
  })

  it('does nothing for an empty meal', () => {
    const onCopy = jest.fn(async () => {})
    renderSheet({ itemCount: 0, onCopy })

    expect(screen.getByRole('button', { name: /copy 0 items/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /copy 0 items/i }))
    expect(onCopy).not.toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <CopyMealSheet
        isOpen={false}
        onClose={jest.fn()}
        fromMeal="lunch"
        fromDate="2026-10-17"
        itemCount={1}
        onCopy={jest.fn(async () => {})}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
