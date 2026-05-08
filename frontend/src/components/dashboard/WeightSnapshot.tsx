import { formatWeight } from '@/utils/formatters'

interface WeightSnapshotProps {
  current: number | null
  changeYesterday: number | null
  changeWeekAgo: number | null
}

function WeightSnapshot({ current, changeYesterday, changeWeekAgo }: WeightSnapshotProps) {
  if (current === null || current === undefined) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body items-center text-center">
          <h2 className="card-title text-base">Weight</h2>
          <p className="text-sm text-base-content/50 mt-2">No weight data yet</p>
        </div>
      </div>
    )
  }

  const getYesterdayTrend = () => {
    if (changeYesterday === null || changeYesterday === undefined) return { label: '—', color: 'text-base-content/50' }
    if (changeYesterday > 0) return { label: '↑', color: 'text-error' }
    if (changeYesterday < 0) return { label: '↓', color: 'text-success' }
    return { label: '→', color: 'text-info' }
  }

  const getWeekTrend = () => {
    if (changeWeekAgo === null || changeWeekAgo === undefined) return { label: '—', color: 'text-base-content/50' }
    if (changeWeekAgo > 0) return { label: '↑', color: 'text-error' }
    if (changeWeekAgo < 0) return { label: '↓', color: 'text-success' }
    return { label: '→', color: 'text-info' }
  }

  const yesterday = getYesterdayTrend()
  const week = getWeekTrend()

  const formatChange = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(1)} lbs`

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body items-center text-center">
        <h2 className="card-title text-base">Weight</h2>

        <div className="mt-2">
          <span className="text-3xl font-bold">{formatWeight(current)}</span>
        </div>

        <div className="divider my-1 px-4"></div>

        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="text-center">
            <p className="text-xs text-base-content/50">Yesterday</p>
            <p className={`text-lg font-bold ${yesterday.color}`}>{yesterday.label}</p>
            {changeYesterday !== null && changeYesterday !== undefined && (
              <p className="text-xs text-base-content/60">
                {formatChange(changeYesterday)}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-base-content/50">This Week</p>
            <p className={`text-lg font-bold ${week.color}`}>{week.label}</p>
            {changeWeekAgo !== null && changeWeekAgo !== undefined && (
              <p className="text-xs text-base-content/60">
                {formatChange(changeWeekAgo)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeightSnapshot
