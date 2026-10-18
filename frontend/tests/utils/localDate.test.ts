import { localDateOf, todayLocal } from '@/utils/localDate'

// FF-0059: "today" must be the user's calendar day, not UTC's. West of UTC a food
// logged in the evening was filed on tomorrow and disappeared from the diary.

/** The expectation computed independently, with local getters. */
function localYmd(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

describe('todayLocal (FF-0059)', () => {
  it('returns the local calendar date of the given instant', () => {
    const instant = new Date('2026-10-17T15:30:00Z')
    expect(todayLocal(instant)).toBe(localYmd(instant))
    expect(todayLocal(instant)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('filing an evening entry does not roll over to tomorrow', () => {
    // 00:54 UTC on the 18th is 20:54 EDT on the 17th - the exact moment the owner's
    // five duplicate "Nuts" logs were filed a day ahead.
    const evening = new Date('2026-10-18T00:54:49Z')
    const expected = localYmd(evening)

    expect(todayLocal(evening)).toBe(expected)
    // A UTC-derived date is only equal to the local one when the host sits at UTC+0.
    const utcDerived = evening.toISOString().split('T')[0]
    if (evening.getTimezoneOffset() !== 0) {
      expect(utcDerived).not.toBe(expected)
      expect(todayLocal(evening)).not.toBe(utcDerived)
    }
  })

  it('defaults to now', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-18T00:54:49Z'))
    try {
      expect(todayLocal()).toBe(localYmd(new Date()))
    } finally {
      jest.useRealTimers()
    }
  })

  it('formats a stored timestamp by its local date', () => {
    const recorded = '2026-10-18T00:54:49'
    expect(localDateOf(recorded)).toBe(localDateOf(new Date(recorded)))
    expect(localDateOf(new Date('2026-10-17T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
