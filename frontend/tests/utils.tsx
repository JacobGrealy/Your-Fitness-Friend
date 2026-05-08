import { render } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

// Render component with router context
export function renderWithRouter(
  ui: React.ReactElement,
  { route = '/', path = route } = {}
) {
  const router = createMemoryRouter([{ path, element: ui }], {
    initialEntries: [route],
  })
  return {
    ...render(<RouterProvider router={router} />),
    router,
  }
}

// Render component with React Hook Form
export function renderWithForm(ui: React.ReactElement) {
  return render(ui)
}
