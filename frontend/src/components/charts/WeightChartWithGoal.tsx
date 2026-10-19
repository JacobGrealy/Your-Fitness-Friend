import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  Label,
} from 'recharts'
import { format } from 'date-fns'

export interface BmiOverlay {
  /** Shaded healthy band, in pounds. */
  healthyRange?: { low: number; high: number } | null
  /** Lines where overweight and obese begin, in pounds. */
  overweightFrom?: number | null
  obeseFrom?: number | null
}

export interface WeightChartWithGoalProps {
  data: { date: string; weight: number }[]
  height?: number
  goal?: number
  /** Reference bands drawn behind the series (FF-0085). */
  bmi?: BmiOverlay
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

export default function WeightChartWithGoal({ data, height = 180, goal, bmi }: WeightChartWithGoalProps) {
  const chartData = data.slice(-30)

  const yAxisDomain = (() => {
    if (chartData.length === 0) return ['auto', 'auto']
    const weights = chartData.map(d => d.weight)
    const dataMin = Math.min(...weights)
    const dataMax = Math.max(...weights)
    const overlayValues = [
      bmi?.healthyRange?.low,
      bmi?.healthyRange?.high,
      bmi?.overweightFrom,
      bmi?.obeseFrom,
    ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

    if (goal !== undefined && goal !== null || overlayValues.length > 0) {
      const allValues = [
        ...weights,
        ...(goal !== undefined && goal !== null ? [goal] : []),
        ...overlayValues,
      ]
      const globalMin = Math.min(...allValues)
      const globalMax = Math.max(...allValues)
      const padding = Math.max((globalMax - globalMin) * 0.15, 1)
      return [globalMin - padding, globalMax + padding]
    }
    const padding = (dataMax - dataMin) * 0.15 || 2
    return [dataMin - padding, dataMax + padding]
  })()

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
            domain={yAxisDomain}
          />
          <Tooltip content={<CustomTooltip />} />
          {bmi?.healthyRange && (
              <ReferenceArea
                y1={bmi.healthyRange.low}
                y2={bmi.healthyRange.high}
                fill="#22c55e"
                fillOpacity={0.12}
                stroke="none"
                ifOverflow="hidden"
              />
            )}
            {typeof bmi?.overweightFrom === 'number' && (
              <ReferenceLine
                y={bmi.overweightFrom}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                ifOverflow="hidden"
              >
                <Label value="Overweight" position="insideTopRight" fill="#b45309" fontSize={10} />
              </ReferenceLine>
            )}
            {typeof bmi?.obeseFrom === 'number' && (
              <ReferenceLine
                y={bmi.obeseFrom}
                stroke="#ef4444"
                strokeDasharray="4 4"
                ifOverflow="hidden"
              >
                <Label value="Obese" position="insideTopRight" fill="#b91c1c" fontSize={10} />
              </ReferenceLine>
            )}
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
