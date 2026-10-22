import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import FoodLogOptions from '@/pages/Food/FoodLogOptions'
const setTitle = jest.fn()
jest.mock('@/components/layout/PageTitleContext', () => ({ usePageTitle: () => ({ setTitle }) }))
function Probe() { const location = useLocation(); return <pre data-testid="destination">{JSON.stringify(location)}</pre> }

test('offers the four distinct logging methods and carries meal/date', () => {
  render(<MemoryRouter initialEntries={['/food/log/options?meal=dinner&date=2026-10-21']}><FoodLogOptions /></MemoryRouter>)
  expect(screen.getAllByRole('link')).toHaveLength(4)
  expect(screen.getByRole('link', { name: /Quick Add/ })).toHaveAttribute('href', '/food/log/select?meal=dinner&date=2026-10-21')
  expect(screen.getByRole('link', { name: /Barcode Scan/ })).toHaveAttribute('href', '/food/log?meal=dinner&date=2026-10-21&method=barcode')
  expect(screen.getByRole('link', { name: /Photo/ })).toHaveAttribute('href', '/food/photo-log?meal=dinner&date=2026-10-21')
  expect(screen.getByRole('link', { name: /Search/ })).toHaveAttribute('href', '/food/log?meal=dinner&date=2026-10-21')
})

test('carries return origin to the selected flow', () => {
  render(<MemoryRouter initialEntries={[{ pathname: '/food/log/options', state: { returnTo: '/food/daily' } }]}><FoodLogOptions /><Probe /></MemoryRouter>)
  fireEvent.click(screen.getByRole('link', { name: /Quick Add/ }))
  expect(screen.getByTestId('destination')).toHaveTextContent('returnTo')
  expect(screen.getByTestId('destination')).toHaveTextContent('/food/daily')
})
