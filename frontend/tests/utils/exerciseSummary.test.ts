import { exerciseSummary } from '@/utils/exerciseSummary'

test('strength summary lists actual set reps and load conventions without treadmill fields', () => {
  const text = exerciseSummary({ duration: 30, details: { exercises: [
    { name: 'Bench Press', equipment: 'barbell', sets: [{ reps: 10, weight_lbs: 95 }, { reps: 8, weight_lbs: 105 }] },
    { name: 'Curl', equipment: 'dumbbell', sets: [{ reps: 12, weight_lbs: 20 }] },
    { name: 'Push-up', equipment: 'bodyweight', sets: [{ reps: 15, weight_lbs: null }] },
  ] } } as any)
  expect(text).toContain('Bench Press: 10 × 95 lb, 8 × 105 lb')
  expect(text).toContain('Curl: 12 × 20 lb/hand')
  expect(text).toContain('Push-up: 15 reps')
  expect(text).not.toContain('mph')
  expect(text).not.toContain('undefined')
})

test('mobility and stationary cycling summaries tolerate nullable metrics', () => {
  expect(exerciseSummary({ duration: 30, details: { speed_mph: null, incline_percent: null, distance_miles: null, yoga_style: 'vinyasa', power_watts: null } } as any)).toBe('30 min · vinyasa yoga')
  expect(exerciseSummary({ duration: 20, details: { speed_mph: null, incline_percent: null, distance_miles: 5, power_watts: 100 } } as any)).toBe('20 min · 5 mi · 100 W')
})
