import { render, screen, fireEvent } from '@testing-library/react'
import EmptyState from '@/components/common/EmptyState'

describe('EmptyState component', () => {
  describe('renders title', () => {
    it('displays title text', () => {
      render(<EmptyState title="No Data" />)
      expect(screen.getByText('No Data')).toBeInTheDocument()
    })
  })

  describe('renders description', () => {
    it('displays description when provided', () => {
      render(<EmptyState title="No Data" description="You haven't added any items yet." />)
      expect(screen.getByText("You haven't added any items yet.")).toBeInTheDocument()
    })

    it('does not render description when not provided', () => {
      const { container } = render(<EmptyState title="No Data" />)
      expect(container.querySelector('p')).not.toBeInTheDocument()
    })
  })

  describe('renders action button', () => {
    it('displays action button when actionLabel and onAction are provided', () => {
      render(
        <EmptyState
          title="No Data"
          actionLabel="Add Item"
          onAction={() => {}}
        />
      )
      expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument()
    })

    it('does not display action button when actionLabel is missing', () => {
      render(<EmptyState title="No Data" onAction={() => {}} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('does not display action button when onAction is missing', () => {
      render(<EmptyState title="No Data" actionLabel="Add Item" />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('action button click handler', () => {
    it('calls onAction when button is clicked', () => {
      const handleAction = jest.fn()
      render(
        <EmptyState
          title="No Data"
          actionLabel="Add Item"
          onAction={handleAction}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /add item/i }))
      expect(handleAction).toHaveBeenCalledTimes(1)
    })
  })
})
