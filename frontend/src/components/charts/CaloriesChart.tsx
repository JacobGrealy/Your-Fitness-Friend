import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { cn } from '@/components/common/cn'

export interface CaloriesChartProps {
  data: { date: string; consumed: number; goal: number }[]
  height?: number
  title?: string
  className?: string
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { date: string } }> }) => {
  if (active && payload && payload.length) {
    const date = new Date(payload[0].payload.date)
    const formattedDate = format(date, 'MMM dd, yyyy')
    const consumed = payload.find(p => p.name === 'Consumed')?.value ?? 0
    const goal = payload.find(p => p.name === 'Goal')?.value ?? 0
    const remaining = goal - consumed
    return (
      <div className="rounded-lg bg-base-100 px-3 py-2 shadow-md">
        <p className="text-sm font-medium text-base-content">{formattedDate}</p>
        <p className="text-sm text-base-content">Consumed: <span className="font-bold">{consumed}</span> kcal</p>
        <p className="text-sm text-base-content">Goal: <span className="font-bold">{goal}</span> kcal</p>
        <p className={`text-sm ${remaining >= 0 ? 'text-success' : 'text-error'}`}>
          Remaining: <span className="font-bold">{remaining}</span> kcal
        </p>
      </div>
    )
  }
  return null
}

export default function CaloriesChart({ data, height = 200, title, className }: CaloriesChartProps) {
  const slicedData = data.slice(-7)

  if (slicedData.length === 0) {
    return (
      <div className={cn('card bg-base-100', className)}>
        <div className="card-body">
          {title && <h2 className="card-title">{title}</h2>}
          <p className="text-sm text-base-content/50">No calorie data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('card bg-base-100', className)}>
      {title && (
        <div className="card-body">
          <h2 className="card-title">{title}</h2>
        </div>
      )}
      <div className={title ? '' : 'card-body'}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={slicedData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-base-300" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              className="text-xs"
              tick={{ fill: 'var(--bc)', fontSize: 11 }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'var(--bc)', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="consumed"
              fill="var(--ac)"
              name="Consumed"
              radius={[4, 4, 0, 0]}
              aria-label="Calories consumed"
            />
            <Bar
              dataKey="goal"
              fill="transparent"
              stroke="var(--bc)"
              strokeDasharray="5 5"
              name="Goal"
              radius={[4, 4, 0, 0]}
              aria-label="Calorie goal"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
