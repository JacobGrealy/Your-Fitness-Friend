import { render, screen } from '@testing-library/react'
import Card from '@/components/common/Card'

describe('Card component', () => {
  describe('renders children', () => {
    it('displays children content', () => {
      render(<Card><p>Card content</p></Card>)
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })
  })

  describe('renders with title', () => {
    it('displays title text', () => {
      render(<Card title="Card Title"><p>Content</p></Card>)
      expect(screen.getByText('Card Title')).toBeInTheDocument()
    })

    it('applies title styling', () => {
      const { container } = render(<Card title="Card Title"><p>Content</p></Card>)
      expect(container.querySelector('h2')).toHaveTextContent('Card Title')
    })
  })

  describe('renders with subtitle', () => {
    it('displays subtitle text', () => {
      render(<Card title="Title" subtitle="Subtitle text"><p>Content</p></Card>)
      expect(screen.getByText('Subtitle text')).toBeInTheDocument()
    })
  })

  describe('shadow class', () => {
    it('applies shadow-sm when shadow is true', () => {
      const { container } = render(<Card shadow><p>Content</p></Card>)
      expect(container.querySelector('[class*="bg-white"]')).toHaveClass('shadow-sm')
    })

    it('does not apply shadow by default', () => {
      const { container } = render(<Card><p>Content</p></Card>)
      expect(container.querySelector('[class*="bg-white"]')).not.toHaveClass('shadow-sm')
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(<Card className="custom-class"><p>Content</p></Card>)
      expect(container.querySelector('[class*="bg-white"]')).toHaveClass('custom-class')
    })
  })
})
