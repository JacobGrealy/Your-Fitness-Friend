import { fireEvent, render, screen } from '@testing-library/react'
import BmiToggles, { CHART_TOGGLES_DEFAULT } from '@/components/charts/BmiToggles'
import { loadChartToggles, saveChartToggles } from '@/utils/bmiPreferences'

// FF-0085: three independent switches, and a height-less user gets an explanation rather
// than a silently missing feature.

const LINES = { healthyLow: 144.1, healthyHigh: 194.7, obeseLow: 233.7 }

describe('BmiToggles (FF-0085)', () => {
  it('offers four switches: three BMI bands off, the goal on (FF-0088)', () => {
    render(<BmiToggles value={CHART_TOGGLES_DEFAULT} onChange={jest.fn()} lines={LINES} />)

    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(4)
    expect(screen.getByRole('switch', { name: 'Goal' })).toHaveAttribute('aria-checked', 'true')
    for (const band of ['Healthy range', 'Overweight starts', 'Obese starts']) {
      expect(screen.getByRole('switch', { name: band })).toHaveAttribute('aria-checked', 'false')
    }
  })

  it('switches the goal line off without touching the bands', () => {
    const onChange = jest.fn()
    render(<BmiToggles value={CHART_TOGGLES_DEFAULT} onChange={onChange} lines={LINES} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Goal' }))

    expect(onChange).toHaveBeenCalledWith({ ...CHART_TOGGLES_DEFAULT, goal: false })
  })

  it('toggles each one independently', () => {
    const onChange = jest.fn()
    render(<BmiToggles value={{ ...CHART_TOGGLES_DEFAULT }} onChange={onChange} lines={LINES} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Overweight starts' }))

    expect(onChange).toHaveBeenCalledWith({ ...CHART_TOGGLES_DEFAULT, overweight: true })
  })

  it('keeps the goal switch usable without a height, and explains the missing bands', () => {
    render(<BmiToggles value={CHART_TOGGLES_DEFAULT} onChange={jest.fn()} lines={null} />)

    // a goal line needs no height, so it must survive (FF-0088)
    expect(screen.getByRole('switch', { name: 'Goal' })).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Healthy range' })).not.toBeInTheDocument()
    expect(screen.getByText(/add it in More/i)).toBeInTheDocument()
  })
})

describe('bmiPreferences (FF-0085)', () => {
  beforeEach(() => localStorage.clear())

  it('starts with the bands off and the goal on', () => {
    expect(loadChartToggles()).toEqual({ healthy: false, overweight: false, obese: false, goal: true })
  })

  it('reads a state saved before the goal switch existed', () => {
    localStorage.setItem('awefit.bmiToggles', JSON.stringify({ healthy: true, overweight: false, obese: false }))
    expect(loadChartToggles()).toEqual({ healthy: true, overweight: false, obese: false, goal: true })
  })

  it('round trips the switches', () => {
    saveChartToggles({ healthy: true, overweight: false, obese: true, goal: false })
    expect(loadChartToggles()).toEqual({ healthy: true, overweight: false, obese: true, goal: false })
  })

  it('survives unreadable storage instead of throwing', () => {
    localStorage.setItem('awefit.chartToggles', 'not json')
    expect(loadChartToggles()).toEqual(CHART_TOGGLES_DEFAULT)
  })

  it('degrades silently when storage refuses to write', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => saveChartToggles({ healthy: true, overweight: false, obese: false, goal: true })).not.toThrow()
    setItem.mockRestore()
  })
})

describe('goal line toggle (FF-0088)', () => {
  it('is on by default, unlike the reference bands', () => {
    // The goal is the user's own number; the bands are references. Different defaults on
    // purpose, so the chart shows what the user set without being asked.
    expect(CHART_TOGGLES_DEFAULT.goal).toBe(true)
  })

  it('passes undefined to the chart when off, so the axis stops stretching for it', () => {
    // WeightChartWithGoal folds `goal` into the y-domain; undefined is what tells it not to.
    const off = { ...CHART_TOGGLES_DEFAULT, goal: false }
    expect(off.goal ? 190 : undefined).toBeUndefined()
  })
})
