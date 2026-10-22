import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FABModal from '@/components/layout/FABModal'

// FF-0015 asked for "Log Food Photo" to be the first option in the add menu. It
// already was, so this test exists to stop a future reorder from quietly making
// the slowest path the default one again.
describe('Add menu ordering (FF-0015)', () => {
  const open = () =>
    render(
      <MemoryRouter>
        <FABModal isOpen onClose={jest.fn()} />
      </MemoryRouter>
    )

  it('offers Log Food Photo first', () => {
    open()

    const labels = screen.getAllByTestId('fab-option').map((el) => el.textContent?.trim())

    expect(labels[0]).toBe('Log Food Photo')
    expect(labels).toEqual([
      'Log Food Photo',
      'Log Food',
      'Log Weight',
      'Log Exercise',
      'Log Medication',
      'Log Bowel Movement',
    ])
  })

  it('closes itself before navigating', () => {
    const onClose = jest.fn()
    render(
      <MemoryRouter>
        <FABModal isOpen onClose={onClose} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('Log Food Photo'))

    expect(onClose).toHaveBeenCalled()
  })
})
