import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import { cn } from '@/components/common/cn'

export interface WeightChartProps {
  data: { date: string; weight: number }[]
  height?: number
  title?: string
  className?: string
  goal?: number
}

const formatYAxis = (value: number): string => value.toFixed(1)

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { date: string } }> }) => {
  if (active && payload && payload.length) {
    const date = new Date(payload[0].payload.date)
    const formattedDate = format(date, 'MMM dd, yyyy')
    return (
      <div className="rounded-lg bg-base-100 px-3 py-2 shadow-md">
        <p className="text-sm font-medium text-base-content">{formattedDate}</p>
        <p className="text-sm font-bold text-accent">{payload[0].value.toFixed(1)} lbs</p>
      </div>
    )
  }
  return null
}

export default function WeightChart({ data, height = 200, title, className, goal }: WeightChartProps) {
  const slicedData = data.slice(-30)

  if (slicedData.length === 0) {
    return (
      <div className={cn('card bg-base-100', className)}>
        <div className="card-body">
          {title && <h2 className="card-title">{title}</h2>}
          <p className="text-sm text-base-content/50">No weight data available</p>
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
          <LineChart data={slicedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3b3b52" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              className="text-xs"
              tick={{ fill: '#cdd6f4', fontSize: 11 }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              className="text-xs"
              tick={{ fill: '#cdd6f4', fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            {goal && (
              <ReferenceLine y={goal} stroke="#22c55e" strokeDasharray="5 5" />
            )}
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#85baf8"
              strokeWidth={2}
              dot={{ fill: '#85baf8', r: 4 }}
              activeDot={{ r: 5, stroke: '#85baf8', strokeWidth: 2 }}
              aria-label="Weight trend"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
