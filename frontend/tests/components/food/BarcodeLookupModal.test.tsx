import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BarcodeLookupModal from '@/components/food/BarcodeLookupModal'
import { foodApi } from '@/api/food'

jest.mock('@/api/food', () => ({
  foodApi: { lookupBarcode: jest.fn() },
}))

const nutella = {
  id: 42,
  name: 'Nutella',
  brand: 'Ferrero',
  calories: 539,
  protein_g: 6.3,
  carbs_g: 57.5,
  fat_g: 30.9,
  serving_size: '15 g',
  barcode_id: '3017620422003',
}

const lookup = foodApi.lookupBarcode as jest.Mock

describe('BarcodeLookupModal (FF-0014)', () => {
  beforeEach(() => lookup.mockReset())

  const open = (onFound = jest.fn()) => {
    render(<BarcodeLookupModal isOpen onClose={jest.fn()} onFound={onFound} />)
    return onFound
  }

  it('looks a code up and offers to add the product', async () => {
    lookup.mockResolvedValue({ food: nutella, source: 'openfoodfacts', barcode: '3017620422003' })
    const onFound = open()

    fireEvent.change(screen.getByLabelText(/barcode number/i), { target: { value: '3017620422003' } })
    fireEvent.click(screen.getByRole('button', { name: /look up/i }))

    await waitFor(() => expect(screen.getByText('Nutella')).toBeInTheDocument())
    expect(lookup).toHaveBeenCalledWith('3017620422003')
    expect(screen.getByText(/539 kcal/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /add to diary/i }))
    expect(onFound).toHaveBeenCalledWith(expect.objectContaining({ id: 42, name: 'Nutella' }))
  })

  it('explains an unknown barcode instead of failing silently', async () => {
    lookup.mockRejectedValue({ response: { status: 404 } })
    const onFound = open()

    fireEvent.change(screen.getByLabelText(/barcode number/i), { target: { value: '0000000000000' } })
    fireEvent.click(screen.getByRole('button', { name: /look up/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no product found/i))
    expect(onFound).not.toHaveBeenCalled()
    // the sheet stays usable so a typo can be corrected
    expect(screen.getByLabelText(/barcode number/i)).toBeInTheDocument()
  })

  it('distinguishes an unreachable lookup service from an unknown product', async () => {
    lookup.mockRejectedValue({ response: { status: 503 } })
    open()

    fireEvent.change(screen.getByLabelText(/barcode number/i), { target: { value: '3017620422003' } })
    fireEvent.click(screen.getByRole('button', { name: /look up/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/unavailable right now/i))
  })

  it('will not submit an empty code', () => {
    open()
    expect(screen.getByRole('button', { name: /look up/i })).toBeDisabled()
  })
})
