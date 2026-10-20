import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RemindersCard from '@/components/profile/RemindersCard'

// FF-0056: the card is the only place reminders are turned on, so it has to be
// honest about where they work and about a refused permission.

const applyReminders = jest.fn()
const remindersAvailable = jest.fn(() => true)

jest.mock('@/reminderLifecycle', () => ({
  refreshReminderSchedule: (...args: unknown[]) => applyReminders(...args),
}))

jest.mock('@/notifications', () => {
  const actual = jest.requireActual('@/notifications')
  return {
    ...actual,
    applyReminders: (...args: unknown[]) => applyReminders(...args),
    remindersAvailable: () => remindersAvailable(),
  }
})

describe('RemindersCard (FF-0056)', () => {
  beforeEach(() => {
    applyReminders.mockReset().mockResolvedValue('scheduled')
    remindersAvailable.mockReturnValue(true)
    localStorage.clear()
  })

  it('offers a switch and a time for each meal, plus a weekly weigh-in', () => {
    render(<RemindersCard />)
    expect(screen.getByLabelText('Breakfast reminder')).not.toBeChecked()
    expect(screen.getByLabelText('Lunch reminder time')).toHaveValue('12:30')
    expect(screen.getByLabelText('Weigh-in reminder')).not.toBeChecked()
  })

  it('schedules the reminder when a meal is switched on', async () => {
    render(<RemindersCard />)
    fireEvent.click(screen.getByLabelText('Lunch reminder'))

    await waitFor(() => expect(applyReminders).toHaveBeenCalled())
    expect(applyReminders.mock.calls[0][0].lunch.enabled).toBe(true)
    expect(await screen.findByRole('status')).toHaveTextContent('Reminders updated')
  })

  it('says so when notifications are blocked, instead of claiming success', async () => {
    applyReminders.mockResolvedValue('denied')
    render(<RemindersCard />)
    fireEvent.click(screen.getByLabelText('Breakfast reminder'))

    expect(await screen.findByRole('status')).toHaveTextContent(/blocked for AweFit/i)
  })

  it('tells an old build to install the latest rather than failing silently', async () => {
    applyReminders.mockResolvedValue('unsupported')
    render(<RemindersCard />)
    fireEvent.click(screen.getByLabelText('Dinner reminder'))

    expect(await screen.findByRole('status')).toHaveTextContent(/install the latest AweFit/i)
  })

  it('explains that reminders need the app when running in a browser', () => {
    remindersAvailable.mockReturnValue(false)
    render(<RemindersCard />)
    expect(screen.getByText(/only work in the AweFit app/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Lunch reminder')).toBeDisabled()
  })

  it('reveals the day chooser only once the weigh-in reminder is on', async () => {
    render(<RemindersCard />)
    expect(screen.queryByLabelText('Weigh-in day')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Weigh-in reminder'))
    expect(await screen.findByLabelText('Weigh-in day')).toBeInTheDocument()
  })
})
