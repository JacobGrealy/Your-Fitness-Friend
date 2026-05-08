import { render, screen, fireEvent } from '@testing-library/react'
import Input from '@/components/common/Input'

describe('Input component', () => {
  describe('renders with label', () => {
    it('displays label text', () => {
      render(<Input label="Username" id="username" />)
      expect(screen.getByText('Username')).toBeInTheDocument()
    })
  })

  describe('renders with error', () => {
    it('displays error message', () => {
      render(<Input label="Email" error="Invalid email" id="email" />)
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
    })

    it('applies input-error class', () => {
      const { container } = render(<Input label="Email" error="Invalid email" id="email" />)
      expect(container.querySelector('input')).toHaveClass('input-error')
    })

    it('sets aria-invalid to true', () => {
      const { container } = render(<Input label="Email" error="Invalid email" id="email" />)
      expect(container.querySelector('input')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('renders with helperText', () => {
    it('displays helper text', () => {
      render(<Input label="Password" helperText="Must be at least 6 characters" id="password" />)
      expect(screen.getByText('Must be at least 6 characters')).toBeInTheDocument()
    })

    it('does not display helper text when error is present', () => {
      render(<Input label="Password" error="Too short" helperText="Must be at least 6 characters" id="password" />)
      expect(screen.queryByText('Must be at least 6 characters')).not.toBeInTheDocument()
    })
  })

  describe('controlled value', () => {
    it('displays the provided value', () => {
      render(<Input value="test value" id="test" />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('test value')
    })
  })

  describe('onChange handler', () => {
    it('calls onChange when input changes', () => {
      const handleChange = jest.fn()
      render(<Input onChange={handleChange} id="test" />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'new value' } })
      expect(handleChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('different input types', () => {
    it('renders email type input', () => {
      render(<Input type="email" id="email" />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.type).toBe('email')
    })

    it('renders password type input', () => {
      render(<Input type="password" id="password" />)
      const input = document.getElementById('password') as HTMLInputElement
      expect(input.type).toBe('password')
    })

    it('renders number type input', () => {
      render(<Input type="number" id="number" />)
      const input = screen.getByRole('spinbutton') as HTMLInputElement
      expect(input.type).toBe('number')
    })
  })
})
