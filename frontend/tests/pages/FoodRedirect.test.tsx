import { render, screen } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

// FF-0031: /food used to render a stale duplicate diary. It now redirects, so a
// bookmark lands on the real one instead of a lookalike with no way forward.

function LocationProbe() {
  const location = useLocation()
  return <p>at {location.pathname}</p>
}

describe('/food redirect (FF-0031)', () => {
  it('sends the old path to the real diary', async () => {
    render(
      <MemoryRouter initialEntries={['/food']}>
        <Routes>
          <Route path="/food" element={<Navigate to="/food/daily" replace />} />
          <Route path="/food/daily" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('at /food/daily')).toBeInTheDocument()
  })
})
