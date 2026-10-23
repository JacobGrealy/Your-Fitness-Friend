import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import FABModal from '@/components/layout/FABModal'

function Probe() { return <p data-testid="location">{useLocation().pathname}</p> }
describe('Quick logging menu', () => {
  it('offers one Log Food option and no management or separate photo option', () => {
    render(<MemoryRouter><FABModal isOpen onClose={jest.fn()} /></MemoryRouter>)
    expect(screen.getAllByTestId('fab-option').map(el => el.textContent?.trim())).toEqual([
      'Log Food', 'Log Weight', 'Log Exercise', 'Log Hydration', 'Log Medication', 'Log Bowel Movement',
    ])
    expect(screen.queryByText('Custom Foods')).not.toBeInTheDocument()
    expect(screen.queryByText('Log Food Photo')).not.toBeInTheDocument()
  })
  it('opens the food chooser and closes the quick menu', () => {
    const onClose = jest.fn()
    render(<MemoryRouter><FABModal isOpen onClose={onClose} /><Probe /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Log Food', exact: true }))
    expect(onClose).toHaveBeenCalled()
    expect(screen.getByTestId('location')).toHaveTextContent('/food/log/options')
  })
})
