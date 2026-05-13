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
    it('applies primary variant styling by default', () => {
      const { container } = render(<Button>Default</Button>)
      const btn = container.querySelector('button')
      expect(btn).toHaveClass('bg-mfp-blue text-white')
    })

    it('applies secondary variant styling', () => {
      const { container } = render(<Button variant="secondary">Secondary</Button>)
      const btn = container.querySelector('button')
      expect(btn).toHaveClass('border border-mfp-blue text-mfp-blue')
    })

    it('applies ghost variant styling', () => {
      const { container } = render(<Button variant="ghost">Ghost</Button>)
      const btn = container.querySelector('button')
      expect(btn).toHaveClass('text-mfp-textSecondary hover:text-mfp-text')
    })

    it('applies outline variant styling', () => {
      const { container } = render(<Button variant="outline">Outline</Button>)
      const btn = container.querySelector('button')
      expect(btn).toHaveClass('border border-mfp-blue text-mfp-blue')
    })

    it('applies accent variant styling', () => {
      const { container } = render(<Button variant="accent">Accent</Button>)
      const btn = container.querySelector('button')
      expect(btn).toHaveClass('bg-mfp-success text-white')
    })
  })

  describe('size classes', () => {
    it('applies md size class by default', () => {
      const { container } = render(<Button>Default</Button>)
      const btn = container.querySelector('button')
      expect(btn).toHaveClass('text-sm px-4 py-2')
    })

    it('applies xs size class', () => {
      const { container } = render(<Button size="xs">XS</Button>)
      const btn = container.querySelector('button')
      expect(btn).toHaveClass('text-xs px-2 py-1')
    })

    it('applies sm size class', () => {
      const { container } = render(<Button size="sm">SM</Button>)
      const btn = container.querySelector('button')
      expect(btn).toHaveClass('text-sm px-3 py-1.5')
    })

    it('applies lg size class', () => {
      const { container } = render(<Button size="lg">LG</Button>)
      const btn = container.querySelector('button')
      expect(btn).toHaveClass('text-base px-6 py-3')
    })
  })

  describe('loading state', () => {
    it('shows loading spinner and disables button', () => {
      const { container } = render(<Button loading>Loading</Button>)
      const button = container.querySelector('button')
      expect(button).toHaveAttribute('disabled')
      expect(button).toHaveClass('disabled:opacity-50')
      expect(container.querySelector('svg')).toBeInTheDocument()
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
      expect(container.querySelector('button')).toHaveClass('disabled:opacity-50')
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
