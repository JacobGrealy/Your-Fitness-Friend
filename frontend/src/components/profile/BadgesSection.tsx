import { useEffect, useState } from 'react'
import { diaryApi, type DiaryBadges } from '@/api/diary'
import { todayLocal } from '@/utils/localDate'

const GREY = '#757575'
const GREEN = '#2E7D32'

const ICONS: Record<string, string> = {
  perfect_week: '🏅',
  on_target_week: '🎯',
  golden_week: '🏆',
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * Badges (FF-0072).
 *
 * Three nested week badges, each repeatable: closing every day of a Sunday–Saturday
 * week earns Perfect week; five or more of those days within 10% of goal also earns
 * On target week; all seven earns Golden week. They are derived from the completion
 * history, so this section is a view of the record rather than a stored trophy case.
 *
 * Best streak lives here and only here — on the diary it would compete with the
 * week you can still affect.
 */
export default function BadgesSection() {
  const [data, setData] = useState<DiaryBadges | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    diaryApi.getBadges(todayLocal())
      .then((badges) => { if (!cancelled) setData(badges) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])

  if (failed) return null

  return (
    <div className="bg-white rounded-lg mt-4 mx-4 overflow-hidden">
      <div className="bg-[#185ADB] px-4 py-3">
        <span className="text-white text-base font-medium">Badges</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {!data ? (
          <p className="text-xs" style={{ color: GREY }}>Loading…</p>
        ) : (
          <>
            <p className="text-xs" style={{ color: GREY }}>
              Closed days, a week at a time — Sunday to Saturday.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {data.badges.map((badge) => {
                const earned = badge.count > 0
                const progress =
                  badge.id === 'perfect_week' ? badge.progress.closed : badge.progress.on_target
                return (
                  <div
                    key={badge.id}
                    data-testid={`badge-${badge.id}`}
                    className="rounded-xl px-2 py-3 text-center border"
                    style={{
                      borderColor: earned ? '#cfe8d5' : '#e0e0e0',
                      background: earned ? '#E8F5E9' : '#fff',
                      opacity: earned ? 1 : 0.55,
                    }}
                  >
                    <div className="text-2xl leading-none" aria-hidden="true">
                      {ICONS[badge.id] ?? '⭐'}
                    </div>
                    <p className="text-[11px] font-semibold mt-2" style={{ color: '#212121' }}>
                      {badge.title}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: GREY }}>
                      {earned ? `× ${badge.count}` : `${progress} / ${badge.progress.of} this week`}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {data.week.days.map((day, index) => (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <span
                    className="w-full h-6 rounded-md"
                    style={{
                      background:
                        day.state === 'on_target'
                          ? GREEN
                          : day.state === 'closed'
                            ? '#185ADB'
                            : day.state === 'open'
                              ? '#FFF8E1'
                              : day.state === 'missed'
                                ? '#e0e0e0'
                                : '#ececec',
                      outline: day.state === 'open' ? '2px solid #F9A825' : undefined,
                    }}
                  />
                  <span className="text-[10px]" style={{ color: GREY }}>{DAY_LABELS[index]}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-center" style={{ color: GREY }}>
              this week: {data.week.closed} / 7 closed, {data.week.on_target} on target
            </p>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div>
                <p className="text-lg font-bold" style={{ color: '#212121' }}>{data.stats.days_closed}</p>
                <p className="text-[10px]" style={{ color: GREY }}>days closed</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#212121' }}>
                  {data.badges.find((badge) => badge.id === 'perfect_week')?.count ?? 0}
                </p>
                <p className="text-[10px]" style={{ color: GREY }}>perfect weeks</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#212121' }}>{data.stats.best_streak}</p>
                <p className="text-[10px]" style={{ color: GREY }}>best streak</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
