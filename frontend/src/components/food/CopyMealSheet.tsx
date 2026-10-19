import { useState } from 'react'
import type { MealType } from '@/types'
import { MEAL_LABELS, MEAL_TYPES } from '@/utils/constants'
import { todayLocal } from '@/utils/localDate'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Where the copies come from: the meal the owner tapped. */
  fromMeal: MealType
  fromDate: string
  itemCount: number
  onCopy: (toDate: string, toMeal: MealType) => Promise<void>
}

/**
 * Copy a whole meal somewhere else (FF-0082).
 *
 * Defaults are the common case: the same meal, today. MyFitnessPal's flow, and the reason
 * the control sits on the meal itself rather than in a separate screen - you are looking at
 * Breakfast when you decide tomorrow's breakfast should be the same.
 */
export default function CopyMealSheet({
  isOpen,
  onClose,
  fromMeal,
  fromDate,
  itemCount,
  onCopy,
}: Props) {
  const [toDate, setToDate] = useState(todayLocal())
  const [toMeal, setToMeal] = useState<MealType>(fromMeal)
  const [copying, setCopying] = useState(false)

  if (!isOpen) return null

  const itemLabel = `${itemCount} item${itemCount === 1 ? '' : 's'}`
  const sameSpot = toDate === fromDate && toMeal === fromMeal

  const handleCopy = async () => {
    if (copying || itemCount === 0) return
    setCopying(true)
    try {
      await onCopy(toDate, toMeal)
      onClose()
    } finally {
      setCopying(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-label={`Copy ${MEAL_LABELS[fromMeal]}`}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold" style={{ color: '#212121' }}>
            Copy {MEAL_LABELS[fromMeal]}
          </p>
          <p className="text-xs" style={{ color: '#757575' }}>{itemLabel}</p>
        </div>

        <p className="text-xs" style={{ color: '#757575' }}>
          From {fromDate}. Everything in it is duplicated; the meal photo is not.
        </p>

        <label className="block text-xs uppercase tracking-wide" style={{ color: '#757575' }}>
          To date
        </label>
        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          aria-label="Copy to date"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-[#fafafa]"
        />

        <label className="block text-xs uppercase tracking-wide" style={{ color: '#757575' }}>
          To meal
        </label>
        <div className="grid grid-cols-4 gap-2">
          {MEAL_TYPES.map((meal) => (
            <button
              key={meal}
              type="button"
              onClick={() => setToMeal(meal)}
              className="py-2 rounded-lg text-xs font-semibold border"
              style={{
                borderColor: toMeal === meal ? '#185ADB' : '#e0e0e0',
                background: toMeal === meal ? '#185ADB' : '#fff',
                color: toMeal === meal ? '#fff' : '#212121',
              }}
            >
              {MEAL_LABELS[meal]}
            </button>
          ))}
        </div>

        {sameSpot && (
          <p className="text-xs" style={{ color: '#8a6d00' }}>
            That is where it already is — the entries will be added again.
          </p>
        )}

        <button
          type="button"
          onClick={handleCopy}
          disabled={copying || itemCount === 0}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#185ADB' }}
        >
          {copying ? 'Copying…' : `Copy ${itemLabel} to ${MEAL_LABELS[toMeal]}`}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-sm font-medium"
          style={{ color: '#757575' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
