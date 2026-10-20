import { applyReminders, loadReminders, type ReminderCompletion, type ReminderSettings, type ScheduleOutcome } from './notifications'
import { todayLocal } from './utils/localDate'

type MealLog = { date?: string; meal_type: string }
type WeighIn = { recorded_at: string }
interface Dependencies {
  userId: string
  isCurrent: () => boolean
  meals: (day: string) => Promise<MealLog[]>
  weights: (day: string) => Promise<WeighIn[]>
  today?: () => string
  settings?: () => ReminderSettings
  apply?: typeof applyReminders
}

/** Authoritative reads, never totals or a potentially backdated/filtered page's store. */
export function createReminderCoordinator(deps: Dependencies) {
  let queue: Promise<unknown> = Promise.resolve()
  const today = deps.today || todayLocal
  const key = `awefit.reminderCompletion:${deps.userId}`

  async function reconcile(settings: ReminderSettings, interactive: boolean): Promise<ScheduleOutcome> {
    if (!deps.isCurrent()) return 'unsupported'
    if (!Object.values(settings).some(reminder => reminder.enabled)) {
      return (deps.apply || applyReminders)(settings, { userId: deps.userId, date: today() }, !interactive)
    }
    // Midnight can occur while HTTP is in flight. Re-read once for the new local date.
    for (let attempt = 0; attempt < 2; attempt++) {
      const date = today()
      let completion: ReminderCompletion = { userId: deps.userId, date }
      try {
        const cached = JSON.parse(localStorage.getItem(key) || 'null')
        if (cached?.userId === deps.userId && cached.date === date) completion = cached
      } catch { /* Unknown state must not become known-empty. Native also retains flags. */ }
      const [meals, weights] = await Promise.allSettled([deps.meals(date), deps.weights(date)])
      if (!deps.isCurrent()) return 'unsupported'
      if (today() !== date) continue
      if (meals.status === 'fulfilled' && Array.isArray(meals.value)) {
        const logged = new Set(meals.value.filter(log => log.date === date).map(log => log.meal_type))
        completion.meals = { breakfast: logged.has('breakfast'), lunch: logged.has('lunch'), dinner: logged.has('dinner') }
      }
      if (weights.status === 'fulfilled' && Array.isArray(weights.value)) {
        completion.weighIn = weights.value.some(log => log.recorded_at.slice(0, 10) === date)
      }
      try { localStorage.setItem(key, JSON.stringify(completion)) } catch { /* Private mode. */ }
      return (deps.apply || applyReminders)(settings, completion, !interactive)
    }
    return 'unsupported'
  }

  return {
    refresh(settings?: ReminderSettings, interactive = false): Promise<ScheduleOutcome> {
      const job = () => reconcile(settings || (deps.settings || loadReminders)(), interactive)
      const next = queue.then(job, job)
      queue = next.catch(() => undefined)
      return next.catch(() => 'unsupported')
    },
  }
}
