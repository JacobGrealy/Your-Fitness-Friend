import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PhotoSourceChooser from '@/components/common/PhotoSourceChooser'
import BottomNav from '@/components/layout/BottomNav'

/**
 * FF-0100: a bottom sheet must paint ABOVE the mobile footer.
 *
 * The footer and the sheets were both `z-50`, and equal z-index resolves by DOM order —
 * BottomNav renders after page content, so it covered the last rows of every sheet.
 * "Choose from gallery" sat behind the footer and Cancel was entirely hidden.
 *
 * These assert the relationship rather than the exact numbers, so either can be
 * restyled as long as the sheet keeps winning.
 */

const zIndexOf = (element: Element): number => {
  const match = element.className.match(/(?:^|\s)z-(\d+)(?:\s|$)/)
  return match ? Number(match[1]) : 0
}

const overlay = () => screen.getByRole('dialog')

describe('bottom sheet layering (FF-0100)', () => {
  it('keeps the photo sheet above the footer', () => {
    render(
      <MemoryRouter>
        <PhotoSourceChooser open onClose={jest.fn()} onSelect={jest.fn()} />
        <BottomNav />
      </MemoryRouter>
    )

    const sheet = zIndexOf(overlay())
    const nav = zIndexOf(screen.getByRole('navigation'))

    expect(sheet).toBeGreaterThan(nav)
  })

  it('still shows every sheet action at full size', () => {
    render(
      <MemoryRouter>
        <PhotoSourceChooser open onClose={jest.fn()} onSelect={jest.fn()} />
      </MemoryRouter>
    )

    // the two buttons the footer used to cover
    expect(screen.getByRole('button', { name: 'Choose from gallery' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()
  })

  it('leaves room for a home indicator under the sheet content', () => {
    render(
      <MemoryRouter>
        <PhotoSourceChooser open onClose={jest.fn()} onSelect={jest.fn()} />
      </MemoryRouter>
    )

    const panel = overlay().firstElementChild as HTMLElement
    expect(panel.className).toContain('env(safe-area-inset-bottom)')
  })
})
