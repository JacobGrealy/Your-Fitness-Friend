import { render, screen, fireEvent } from '@testing-library/react'
import Button from '@/components/common/Button'

describe('Button component', () => {
  describe('renders children', () => {
    it('displays children content', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })
  })

  describe('variant classes', () => {
    it('applies primary variant class by default', () => {
      const { container } = render(<Button>Default</Button>)
      expect(container.querySelector('button')).toHaveClass('btn-primary')
    })

    it('applies secondary variant class', () => {
      const { container } = render(<Button variant="secondary">Secondary</Button>)
      expect(container.querySelector('button')).toHaveClass('btn-secondary')
    })

    it('applies ghost variant class', () => {
      const { container } = render(<Button variant="ghost">Ghost</Button>)
      expect(container.querySelector('button')).toHaveClass('btn-ghost')
    })

    it('applies outline variant class', () => {
      const { container } = render(<Button variant="outline">Outline</Button>)
      expect(container.querySelector('button')).toHaveClass('btn-outline')
    })

    it('applies accent variant class', () => {
      const { container } = render(<Button variant="accent">Accent</Button>)
      expect(container.querySelector('button')).toHaveClass('btn-accent')
    })
  })

  describe('size classes', () => {
    it('applies md size class by default', () => {
      const { container } = render(<Button>Default</Button>)
      expect(container.querySelector('button')).toHaveClass('btn-md')
    })

    it('applies xs size class', () => {
      const { container } = render(<Button size="xs">XS</Button>)
      expect(container.querySelector('button')).toHaveClass('btn-xs')
    })

    it('applies sm size class', () => {
      const { container } = render(<Button size="sm">SM</Button>)
      expect(container.querySelector('button')).toHaveClass('btn-sm')
    })

    it('applies lg size class', () => {
      const { container } = render(<Button size="lg">LG</Button>)
      expect(container.querySelector('button')).toHaveClass('btn-lg')
    })
  })

  describe('loading state', () => {
    it('shows loading spinner and disables button', () => {
      const { container } = render(<Button loading>Loading</Button>)
      const button = container.querySelector('button')
      expect(button).toHaveAttribute('disabled')
      expect(button).toHaveClass('btn-disabled')
      expect(container.querySelector('.loading-spinner')).toBeInTheDocument()
    })
  })

  describe('fullWidth class', () => {
    it('applies w-full class when fullWidth is true', () => {
      const { container } = render(<Button fullWidth>Full Width</Button>)
      expect(container.querySelector('button')).toHaveClass('w-full')
    })

    it('does not apply w-full class by default', () => {
      const { container } = render(<Button>Normal</Button>)
      expect(container.querySelector('button')).not.toHaveClass('w-full')
    })
  })

  describe('disabled state', () => {
    it('sets disabled attribute when disabled is true', () => {
      const { container } = render(<Button disabled>Disabled</Button>)
      expect(container.querySelector('button')).toHaveAttribute('disabled')
      expect(container.querySelector('button')).toHaveClass('btn-disabled')
    })

    it('does not set disabled attribute by default', () => {
      const { container } = render(<Button>Enabled</Button>)
      expect(container.querySelector('button')).not.toHaveAttribute('disabled')
    })
  })

  describe('onClick handler', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click</Button>)
      fireEvent.click(screen.getByRole('button', { name: /click/i }))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const handleClick = jest.fn()
      render(<Button disabled onClick={handleClick}>Disabled</Button>)
      fireEvent.click(screen.getByRole('button', { name: /disabled/i }))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })
})
