import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Label,
} from 'recharts'
import { format } from 'date-fns'

export interface WeightChartWithGoalProps {
  data: { date: string; weight: number }[]
  height?: number
  goal?: number
}

const formatYAxis = (value: number): string => value.toFixed(1)

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { date: string } }> }) => {
  if (active && payload && payload.length) {
    const date = new Date(payload[0].payload.date)
    if (isNaN(date.getTime())) return null
    const formattedDate = format(date, 'MMM dd, yyyy')
    return (
      <div className="rounded-lg bg-white px-3 py-2 border border-[#e0e0e0]">
        <p className="text-sm font-medium" style={{ color: '#212121' }}>{formattedDate}</p>
        <p className="text-sm font-bold" style={{ color: '#185ADB' }}>
          {payload[0].value?.toFixed(1) ?? 'N/A'} lbs
        </p>
      </div>
    )
  }
  return null
}

export default function WeightChartWithGoal({ data, height = 180, goal }: WeightChartWithGoalProps) {
  const chartData = data.slice(-30)

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 border border-[#e0e0e0]">
        <p className="text-sm" style={{ color: '#757575' }}>No weight data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-[#e0e0e0]">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
            tick={{ fill: '#757575', fontSize: 11 }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fill: '#757575', fontSize: 11 }}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          {goal && (
            <ReferenceLine y={goal} stroke="#22c55e" strokeDasharray="5 5">
              <Label value="Goal" position="right" fill="#22c55e" fontSize={11} />
            </ReferenceLine>
          )}
          <Area
            type="monotone"
            dataKey="weight"
            stroke="#185ADB"
            strokeWidth={2}
            fill="none"
            activeDot={{ r: 5, stroke: '#185ADB', strokeWidth: 2 }}
            aria-label="Weight trend"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
