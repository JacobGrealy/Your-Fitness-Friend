import { useEffect, useRef, useState } from 'react'
import { foodApi } from '@/api/food'
import type { ExternalFood, Food } from '@/types'
import { formatMacro } from '@/utils/formatters'

const canonical = (code?: string | null) => code?.length === 12 ? `0${code}` : code

export default function ExternalFoodResults({ query, localFoods, onSelect }: {
  query: string; localFoods: Food[]; onSelect: (food: ExternalFood) => void
}) {
  const [results, setResults] = useState<ExternalFood[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [omitted, setOmitted] = useState(0)
  const generation = useRef(0)

  const load = async (nextPage: number) => {
    const request = ++generation.current
    setLoading(true)
    setError(null)
    try {
      const response = await foodApi.searchOpenFoodFacts(query, nextPage)
      if (request !== generation.current) return
      setResults(previous => {
        const items = nextPage === 1 ? response.results : [...previous, ...response.results]
        return items.filter((item, index) => items.findIndex(other => other.barcode_id === item.barcode_id) === index)
      })
      setPage(nextPage)
      setHasMore(response.has_more && nextPage < 10)
      setOmitted(previous => (nextPage === 1 ? 0 : previous) + response.omitted)
    } catch (err: any) {
      if (request === generation.current) setError(err.response?.data?.error || 'Open Food Facts is unavailable. Your saved foods still work.')
    } finally {
      if (request === generation.current) setLoading(false)
    }
  }
  useEffect(() => {
    void load(1)
    return () => { generation.current++ }
  }, [query])

  const localCodes = new Set(localFoods.map(food => canonical(food.barcode_id)).filter(Boolean))
  const visible = results.filter(food => !localCodes.has(canonical(food.barcode_id)))
  return <section aria-label="Open Food Facts results" className="pt-4 border-t border-[#d9dfe7] space-y-2">
    <h2 className="text-sm font-semibold text-[#185ADB]">Open Food Facts</h2>
    <p className="text-xs text-[#757575]">External results · saved to Your foods when you log.</p>
    {visible.map(food => <button key={food.barcode_id} type="button" onClick={() => onSelect(food)}
      className="w-full bg-white rounded-lg p-3 text-left border border-[#e0e0e0] hover:border-[#185ADB]">
      <span className="block text-sm font-medium text-[#212121]">{food.name}</span>
      {food.brand && <span className="block text-xs text-[#757575] mt-0.5">{food.brand}</span>}
      <span className="block text-xs text-[#757575] mt-1">{formatMacro(food.calories)} cal per {food.serving_size} · P {formatMacro(food.protein_g)} · C {formatMacro(food.carbs_g)} · F {formatMacro(food.fat_g)}</span>
    </button>)}
    {loading && <p role="status" className="text-sm text-[#757575] py-3">Searching Open Food Facts…</p>}
    {error && <p role="alert" className="text-sm text-red-700 py-2">{error}</p>}
    {!loading && !error && visible.length === 0 && <p className="text-sm text-[#757575] py-2">No additional foods with complete nutrition found.</p>}
    {omitted > 0 && <p className="text-xs text-[#757575]">Some results were omitted because their nutrition was incomplete or duplicated.</p>}
    {!loading && (hasMore || error) && <button type="button" onClick={() => void load(error && page === 0 ? 1 : page + 1)}
      className="w-full border border-[#185ADB] rounded-lg text-[#185ADB] text-sm py-2.5">{error ? 'Try again' : 'More results'}</button>}
    <a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer" className="inline-block text-xs text-[#757575] underline py-2">Data: Open Food Facts · ODbL</a>
  </section>
}
