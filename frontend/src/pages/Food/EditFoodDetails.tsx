import { useState, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import type { FoodLogCreate, MealType } from '@/types'
import { useFoodStore } from '@/store/foodStore'
import BarcodeScanner from '@/components/food/BarcodeScanner'
import QuantityFields from '@/components/food/QuantityFields'
import Button from '@/components/common/Button'
import Spinner from '@/components/common/Spinner'
import { formatNumber, perServingOf, type PerServing } from '@/utils/serving'

/**
 * The food half of a diary entry (FF-0086).
 *
 * Macros here are PER SERVING, because that is what a food is. Deliberately no serving
 * count: how many servings you ate belongs to the log, not the food, and mixing the two is
 * what made changing one silently change the other.
 *
 * Saving updates this entry and the saved food behind it, so the next time you log it the
 * corrected values are already there (owner decision on FF-0083).
 */
export default function EditFoodDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getFoodLogById, updateFoodLog, error, isLoading } = useFoodStore()

  const [loaded, setLoaded] = useState(false)
  const [perServing, setPerServing] = useState<PerServing>({
    calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
  })
  const [servings, setServings] = useState(1)
  const [referenceAmount, setReferenceAmount] = useState('')
  const [referenceUnit, setReferenceUnit] = useState('serving')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Pick<FoodLogCreate, 'food_name' | 'brand' | 'serving_size' | 'barcode_id'>>({
    defaultValues: { food_name: '', brand: '', serving_size: '', barcode_id: '' },
  })

  useEffect(() => {
    if (!id) return
    getFoodLogById(id).then((log) => {
      if (!log) return
      setValue('food_name', log.food_name)
      setValue('brand', log.brand ?? '')
      setValue('serving_size', log.serving_size ?? '')
      setValue('barcode_id', log.barcode_id ?? '')
      setPerServing(perServingOf(log))
      setReferenceAmount(log.serving_amount ? String(log.serving_amount) : '')
      setReferenceUnit(log.serving_unit || 'serving')
      setServings(
        typeof log.number_of_servings === 'number' && log.number_of_servings > 0
          ? log.number_of_servings
          : 1
      )
      setLoaded(true)
    })
  }, [id, getFoodLogById, setValue])

  type FoodFormValues = { food_name?: string; brand?: string; serving_size?: string; barcode_id?: string }

  const onSubmit = async (data: FoodFormValues) => {
    if (!id) return
    const barcode = (data.barcode_id ?? '').trim()
    await updateFoodLog(id, {
      food_name: data.food_name ?? '',
      brand: data.brand || undefined,
      serving_size: referenceAmount ? `${referenceAmount} ${referenceUnit}` : data.serving_size || undefined,
      ...(referenceAmount ? { serving_amount: Number(referenceAmount), serving_unit: referenceUnit } : {}),
      // Per-serving, always: the server multiplies by this log's serving count.
      calories_per_serving: perServing.calories,
      protein_per_serving: perServing.protein_g,
      carbs_per_serving: perServing.carbs_g,
      fat_per_serving: perServing.fat_g,
      ...(barcode ? { barcode_id: barcode } : {}),
    } as unknown as FoodLogCreate & { meal_type: MealType })
    navigate(-1)
  }

  const setMacro = useCallback((macro: keyof PerServing, raw: string) => {
    const value = Number.parseFloat(raw)
    setPerServing((prev) => ({ ...prev, [macro]: Number.isFinite(value) ? value : 0 }))
  }, [])

  if (!loaded) {
    return (
      <div className="p-4 flex justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4" style={{ background: '#f2f2f2' }}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
        <h1 className="text-2xl font-bold" style={{ color: '#212121' }}>Food details</h1>
      </div>

      {error && (
        <div className="bg-white rounded-lg p-3 text-sm" style={{ color: '#c62828' }}>{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: '#212121' }}>Name</label>
          <input
            type="text"
            {...register('food_name')}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-[#fafafa]"
          />
          {errors.food_name && (
            <p className="mt-1 text-xs" style={{ color: '#c62828' }}>{errors.food_name.message}</p>
          )}
        </div>

        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: '#212121' }}>Brand (optional)</label>
          <input
            type="text"
            {...register('brand')}
            placeholder="e.g. Eggo"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-[#fafafa]"
          />
        </div>

        <div className="bg-white rounded-lg p-4">
          {referenceAmount !== '' ? <QuantityFields label="Serving size" amount={referenceAmount} unit={referenceUnit}
            onAmount={setReferenceAmount} onUnit={setReferenceUnit} /> : <>
          <label className="block text-sm font-medium mb-2" style={{ color: '#212121' }}>
            Serving size (optional)
          </label>
          <input
            type="text"
            {...register('serving_size')}
            placeholder="e.g. 2 slices (90 g)"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-[#fafafa]"
          />
          <button type="button" className="text-sm text-[#185ADB] mt-2" onClick={() => setReferenceAmount('1')}>Set numeric serving size and unit</button>
          </>}
          <p className="text-xs mt-1" style={{ color: '#757575' }}>
            The nutrition below is for one of these.
          </p>
        </div>

        <div className="bg-white rounded-lg p-4">
          <p className="text-sm font-medium mb-3" style={{ color: '#212121' }}>Per serving</p>

          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#757575' }}>
            Calories
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={perServing.calories}
            onChange={(event) => setMacro('calories', event.target.value)}
            aria-label="Calories per serving"
            className="w-full px-3 py-3 text-3xl font-bold text-center border border-gray-300 rounded-lg bg-[#fafafa]"
          />

          <div className="grid grid-cols-3 gap-3 mt-3">
            {([
              ['protein_g', 'Protein'],
              ['carbs_g', 'Carbs'],
              ['fat_g', 'Fat'],
            ] as const).map(([macro, label]) => (
              <div key={macro} className="text-center">
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#757575' }}>
                  {label}
                </label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={perServing[macro]}
                  onChange={(event) => setMacro(macro, event.target.value)}
                  aria-label={`${label} per serving`}
                  className="w-full px-2 py-2.5 border border-gray-300 rounded-lg text-center bg-[#fafafa]"
                />
              </div>
            ))}
          </div>

          <p className="text-xs mt-3" style={{ color: '#757575' }}>
            This entry will log {formatNumber(perServing.calories * servings)} kcal at{' '}
            {formatNumber(servings)} serving{servings === 1 ? '' : 's'}.
          </p>
        </div>

        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: '#212121' }}>
            Barcode ID (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              {...register('barcode_id')}
              placeholder="e.g. 012345678901"
              className="flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg bg-[#fafafa]"
            />
            <button
              type="button"
              onClick={() => { setScanError(null); setScanning(true) }}
              aria-label="Scan barcode"
              className="flex-shrink-0 w-12 flex items-center justify-center border border-gray-300 rounded-lg bg-white"
            >
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#212121" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 7v10M10 7v10M13.5 7v10M16 7v10M18 7v10" strokeWidth="1.1" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" fullWidth loading={isLoading}>Save Changes</Button>
          <Button variant="outline" fullWidth onClick={() => navigate(-1)} disabled={isLoading}>Cancel</Button>
        </div>
      </form>

      {scanning && (
        <div role="dialog" aria-label="Scan barcode" aria-modal="true" className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-white">Scan barcode</p>
            <button type="button" onClick={() => setScanning(false)} aria-label="Close scanner" className="text-white text-2xl leading-none px-2">✕</button>
          </div>
          {scanError ? (
            <div className="px-4 py-6">
              <p className="text-sm text-white">{scanError}</p>
              <p className="text-xs mt-2" style={{ color: '#bdbdbd' }}>
                The scanner needs the app over https, or the camera permission.
              </p>
              <button
                type="button"
                onClick={() => setScanning(false)}
                className="mt-4 w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: '#185ADB', color: '#fff' }}
              >
                Type the code instead
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <BarcodeScanner
                onDetected={(code) => {
                  setValue('barcode_id', code, { shouldDirty: true })
                  setScanning(false)
                }}
                onUnavailable={(reason) => setScanError(reason)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
