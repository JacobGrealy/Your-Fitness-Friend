import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { cn } from '@/components/common/cn'
import { getMacroPercentage } from '@/utils/formatters'

export interface MacroChartProps {
  protein: number
  carbs: number
  fat: number
  title?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 180,
  md: 240,
  lg: 320,
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, item) => sum + item.value, 0)
    const item = payload[0]
    const percentage = getMacroPercentage(item.value, total)
    return (
      <div className="rounded-lg bg-base-100 px-3 py-2 shadow-md">
        <p className="text-sm font-medium text-base-content">{item.name}</p>
        <p className="text-sm font-bold text-base-content">{item.value}g ({percentage}%)</p>
      </div>
    )
  }
  return null
}

const macroColorMap: Record<string, string> = {
  Protein: 'hsl(var(--bf))',
  Carbs: 'hsl(var(--fa))',
  Fat: 'hsl(var(--se))',
}

export default function MacroChart({ protein, carbs, fat, title, size = 'md', className }: MacroChartProps) {
  const chartSize = sizeMap[size]
  const total = protein + carbs + fat

  if (total === 0) {
    return (
      <div className={cn('card bg-base-100', className)}>
        <div className="card-body">
          {title && <h2 className="card-title">{title}</h2>}
          <p className="text-sm text-base-content/50">No macro data available</p>
        </div>
      </div>
    )
  }

  const chartData = [
    { name: 'Protein', value: protein },
    { name: 'Carbs', value: carbs },
    { name: 'Fat', value: fat },
  ].filter(item => item.value > 0)

  return (
    <div className={cn('card bg-base-100', className)}>
      {title && (
        <div className="card-body">
          <h2 className="card-title">{title}</h2>
        </div>
      )}
      <div className={title ? '' : 'card-body'}>
        <ResponsiveContainer width="100%" height={chartSize}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              innerRadius={size === 'sm' ? 30 : size === 'md' ? 45 : 60}
              outerRadius={size === 'sm' ? 60 : size === 'md' ? 80 : 110}
              fill="#8884d8"
              dataKey="value"
              aria-label="Macro nutrient breakdown"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={macroColorMap[entry.name]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-xs text-base-content">{value}</span>}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
