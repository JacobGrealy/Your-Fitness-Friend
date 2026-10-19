import { UNITS, compatibleUnits } from '@/utils/quantities'

interface Props {
  amount: string | number
  unit: string
  onAmount: (value: string) => void
  onUnit: (unit: string) => void
  referenceUnit?: string | null
  label: string
}

/** Shared number + unit control for reference servings and amounts eaten. */
export default function QuantityFields({ amount, unit, onAmount, onUnit, referenceUnit, label }: Props) {
  const units = referenceUnit === undefined ? Object.keys(UNITS) : compatibleUnits(referenceUnit)
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium text-[#212121] mb-2">{label}</legend>
      <div className="flex gap-2">
        <input aria-label={`${label} amount`} type="number" min="0.000001" step="any"
          inputMode="decimal" required value={amount} onChange={e => onAmount(e.target.value)}
          className="min-w-0 flex-1 px-3 py-2.5 border border-gray-300 rounded-lg bg-[#fafafa] text-[#212121]" />
        <select aria-label={`${label} unit`} value={unit} onChange={e => onUnit(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg bg-[#fafafa] text-[#212121]">
          {units.map(key => <option key={key} value={key}>{UNITS[key].label}</option>)}
        </select>
      </div>
    </fieldset>
  )
}
