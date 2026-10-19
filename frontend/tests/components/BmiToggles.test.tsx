import { fireEvent, render, screen } from '@testing-library/react'
import BmiToggles, { BMI_TOGGLES_OFF } from '@/components/charts/BmiToggles'
import { loadBmiToggles, saveBmiToggles } from '@/utils/bmiPreferences'

// FF-0085: three independent switches, and a height-less user gets an explanation rather
// than a silently missing feature.

const LINES = { healthyLow: 144.1, healthyHigh: 194.7, obeseLow: 233.7 }

describe('BmiToggles (FF-0085)', () => {
  it('offers the three switches, all off by default', () => {
    render(<BmiToggles value={BMI_TOGGLES_OFF} onChange={jest.fn()} lines={LINES} />)

    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(3)
    for (const toggle of switches) expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('toggles each one independently', () => {
    const onChange = jest.fn()
    render(<BmiToggles value={{ ...BMI_TOGGLES_OFF }} onChange={onChange} lines={LINES} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Overweight starts' }))

    expect(onChange).toHaveBeenCalledWith({ healthy: false, overweight: true, obese: false })
  })

  it('explains itself when there is no height instead of hiding', () => {
    render(<BmiToggles value={BMI_TOGGLES_OFF} onChange={jest.fn()} lines={null} />)

    expect(screen.queryAllByRole('switch')).toHaveLength(0)
    expect(screen.getByText(/add it in More/i)).toBeInTheDocument()
  })
})

describe('bmiPreferences (FF-0085)', () => {
  beforeEach(() => localStorage.clear())

  it('starts with everything off', () => {
    expect(loadBmiToggles()).toEqual(BMI_TOGGLES_OFF)
  })

  it('round trips the switches', () => {
    saveBmiToggles({ healthy: true, overweight: false, obese: true })
    expect(loadBmiToggles()).toEqual({ healthy: true, overweight: false, obese: true })
  })

  it('survives unreadable storage instead of throwing', () => {
    localStorage.setItem('awefit.bmiToggles', 'not json')
    expect(loadBmiToggles()).toEqual(BMI_TOGGLES_OFF)
  })

  it('degrades silently when storage refuses to write', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => saveBmiToggles({ healthy: true, overweight: false, obese: false })).not.toThrow()
    setItem.mockRestore()
  })
})
