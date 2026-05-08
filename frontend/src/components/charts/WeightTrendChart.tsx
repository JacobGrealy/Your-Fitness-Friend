import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { format } from 'date-fns'
import { cn } from '@/components/common/cn'

export interface WeightTrendChartProps {
  data: { date: string; weight: number }[]
  trend?: 'up' | 'down' | 'stable'
  title?: string
  className?: string
}

const trendColorMap: Record<string, string> = {
  down: 'hsl(var(--su))',
  up: 'hsl(var(--er))',
  stable: 'hsl(var(--in))',
}

const trendGradientMap: Record<string, [string, string]> = {
  down: ['hsl(var(--su))', 'hsl(var(--su) / 0.1)'],
  up: ['hsl(var(--er))', 'hsl(var(--er) / 0.1)'],
  stable: ['hsl(var(--in))', 'hsl(var(--in) / 0.1)'],
}

const formatYAxis = (value: number): string => value.toFixed(1)

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { date: string } }> }) => {
  if (active && payload && payload.length) {
    const date = new Date(payload[0].payload.date)
    const formattedDate = format(date, 'MMM dd, yyyy')
    return (
      <div className="rounded-lg bg-base-100 px-3 py-2 shadow-md">
        <p className="text-sm font-medium text-base-content">{formattedDate}</p>
        <p className="text-sm font-bold" style={{ color: 'var(--ac)' }}>
          {payload[0].value.toFixed(1)} kg
        </p>
      </div>
    )
  }
  return null
}

export default function WeightTrendChart({ data, trend = 'stable', title, className }: WeightTrendChartProps) {
  const chartData = data.slice(-30)
  const strokeColor = trendColorMap[trend]
  const gradientColors = trendGradientMap[trend]

  if (chartData.length === 0) {
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
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-base-300" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              className="text-xs"
              tick={{ fill: 'var(--bc)', fontSize: 11 }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              className="text-xs"
              tick={{ fill: 'var(--bc)', fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="weight"
              stroke={strokeColor}
              strokeWidth={2}
              fill={gradientColors[0]}
              fillOpacity={0.2}
              activeDot={{ r: 5, stroke: strokeColor, strokeWidth: 2 }}
              aria-label="Weight trend"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
