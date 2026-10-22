import type { ActivityId } from '@/types'
export const activityOptions: Record<ActivityId, { name: string; description: string }> = {
  outdoor_walking: { name: 'Outdoor Walking', description: 'Time · Distance or pace' },
  outdoor_running: { name: 'Outdoor Running', description: 'Time · Distance or pace' },
  treadmill_running: { name: 'Treadmill Running', description: 'Time · Speed or pace · Incline' },
  cycling: { name: 'Cycling', description: 'Time · Optional distance' },
  stationary_cycling: { name: 'Stationary Bike', description: 'Time · Measured watts or effort' },
  stretching: { name: 'Stretching', description: 'Time · Session notes' },
  yoga: { name: 'Yoga', description: 'Time · Yoga style' },
}
export function isActivityId(id: string | null): id is ActivityId { return !!id && Object.prototype.hasOwnProperty.call(activityOptions, id) }
