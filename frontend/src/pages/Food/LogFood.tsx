import { formatMacro } from '@/utils/formatters'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useFoodStore } from '@/store/foodStore'
import { foodLogPhotoUrl } from '@/utils/photoUrl'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { Food, FoodRecent, ExternalFood } from '@/types'
import ExternalFoodResults from '@/components/food/ExternalFoodResults'
import { SEARCH_DEBOUNCE_MS } from '@/utils/constants'
import { resolveMealType } from '@/utils/meal'
import { resolveReturnTo, returnState } from '@/utils/returnTo'
import Button from '@/components/common/Button'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import BarcodeLookupModal from '@/components/food/BarcodeLookupModal'

export default function LogFood() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  // Carry the origin through the second half of the add flow.
  const originState = returnState(resolveReturnTo(location.state))
  // The diary passes ?meal=lunch when it opens this screen from a meal section.
  const mealType = resolveMealType(searchParams.get('meal'))
  const [quickAdded, setQuickAdded] = useState<string | null>(null)
  const { foods, recentFoods, isLoading, error, fetchFoods, fetchRecentFoods, clearError, logFood } = useFoodStore()

  const [barcodeOpen, setBarcodeOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [externalSearch, setExternalSearch] = useState<{ query: string; id: number } | null>(null)
  const submitSearch = () => {
    const query = searchTerm.trim()
    if (query.length >= 2 && query.length <= 100) setExternalSearch(previous => ({ query, id: (previous?.id || 0) + 1 }))
  }
  const selectExternal = (food: ExternalFood) => navigate(`/food/log/select?meal=${mealType}`, {
    state: { ...originState, externalFood: food },
  })
  const [searchResults, setSearchResults] = useState<Food[]>([])
  const [historyResults, setHistoryResults] = useState<FoodRecent[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setTitle('Add Food')
    fetchFoods()
    fetchRecentFoods()
    clearError()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchFoods, fetchRecentFoods, clearError])

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
    setExternalSearch(null)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      if (!term.trim()) {
        setSearchResults([])
        setHistoryResults([])
        setShowSearchResults(false)
        return
      }

      const filtered = foods.filter(f =>
        f.name.toLowerCase().includes(term.trim().toLowerCase())
      ).slice(0, 15)

      const matchingHistory = recentFoods.filter(h =>
        h.food_name.toLowerCase().includes(term.trim().toLowerCase())
      )

      setSearchResults(filtered)
      setHistoryResults(matchingHistory)
      setShowSearchResults(true)
    }, SEARCH_DEBOUNCE_MS)
  }, [foods, recentFoods])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearch(e.target.value)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setExternalSearch(null)
    setSearchResults([])
    setHistoryResults([])
    setShowSearchResults(false)
  }

  const handleFoodTap = (food: Food) => {
    navigate(`/food/log/select/${food.id}?meal=${mealType}`, { state: originState })
  }

  const handleHistoryTap = (history: FoodRecent) => {
    const foodIdParam = history.food_id ? `&foodId=${history.food_id}` : ''
    const quantityParams = history.amount && history.unit ? `&amount=${history.amount}&unit=${encodeURIComponent(history.unit)}` : ''
    navigate(
      `/food/log/select?meal=${mealType}&name=${encodeURIComponent(history.food_name)}&calories=${history.calories}&protein=${formatMacro(history.protein_g)}&carbs=${formatMacro(history.carbs_g)}&fat=${formatMacro(history.fat_g)}&brand=${encodeURIComponent(history.brand || '')}&barcode_id=${encodeURIComponent(history.barcode_id || '')}&serving_size=${encodeURIComponent(history.serving_size || '')}${foodIdParam}${quantityParams}`,
      { state: originState }
    )
  }

  const handleBarcode = () => {
    setBarcodeOpen(true)
  }

  /**
   * Log one serving of a recent food without leaving the screen (FF-0018).
   * Deliberately one serving: this is the "same as last time" shortcut, and the
   * diary row can be edited when a different amount is wanted.
   */
  const handleQuickLog = async (history: FoodRecent) => {
    try {
      await logFood({
        food_id: history.food_id ?? undefined,
        food_name: history.food_name,
        calories: history.calories,
        protein_g: history.protein_g,
        carbs_g: history.carbs_g,
        fat_g: history.fat_g,
        brand: history.brand ?? undefined,
        barcode_id: history.barcode_id ?? undefined,
        // The server copies the file so each log owns its own (FF-0087).
        photo_url: history.photo_url ?? undefined,
        serving_size: history.serving_size ?? undefined,
        meal_type: mealType,
        number_of_servings: history.number_of_servings || 1,
        ...(history.serving_amount && history.amount ? {
          serving_amount: history.serving_amount, serving_unit: history.serving_unit,
          amount: history.amount, unit: history.unit,
          calories_per_serving: history.calories_per_serving,
          protein_per_serving: history.protein_per_serving,
          carbs_per_serving: history.carbs_per_serving,
          fat_per_serving: history.fat_per_serving,
        } : {}),
      })
      setQuickAdded(history.food_name)
      window.setTimeout(() => setQuickAdded(null), 1500)
    } catch {
      // logFood surfaces its own error through the store
    }
  }

  // The meal the diary sent us here with follows every method: picking Quick Add
  // from under Snacks must not land on a form that says Breakfast (FF-0038).
  const handleQuickAdd = () => {
    navigate(`/food/log/select?meal=${mealType}`, { state: originState })
  }

  const handleFoodPhoto = () => {
    navigate(`/food/photo-log?meal=${mealType}`, { state: originState })
  }

  if (isLoading && foods.length === 0 && recentFoods.length === 0) {
    return (
      <div className="bg-[#f2f2f2] flex justify-center py-12">
        <Loading text="Loading..." />
      </div>
    )
  }

  const displayItems = showSearchResults
    ? [
        ...historyResults.map(h => ({ ...h, _type: 'history' as const })),
        ...searchResults.filter(f => !historyResults.some(h => String(h.food_id) === String(f.id)))
          .map(f => ({ ...f, _type: 'food' as const })),
      ]
    : recentFoods.map(h => ({ ...h, _type: 'history' as const }))

  return (
    <div className="bg-[#f2f2f2]">
      {/* Sticky Top Zone */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e0e0e0]">
        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submitSearch() } }}
              aria-label="Search foods"
              maxLength={100}
              onFocus={() => searchTerm && setShowSearchResults(true)}
              placeholder="Search foods..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-[#212121] text-sm focus:outline-none focus:ring-2 focus:ring-[#185ADB] focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <Button size="sm" onClick={submitSearch} disabled={searchTerm.trim().length < 2}>Search</Button>
          </div>
          {searchTerm && <p className="text-xs text-[#757575] mt-2">Your foods match as you type. Search to include Open Food Facts.</p>}
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-3 flex gap-2">
          <Button size="sm" onClick={handleQuickAdd}>
            Quick Add
          </Button>
          <Button size="sm" variant="outline" onClick={handleFoodPhoto}>
            Food Photo
          </Button>
          <Button size="sm" variant="outline" onClick={handleBarcode}>
            Barcode
          </Button>
        </div>
      </div>

      {/* Scrollable Results/History Zone */}
      <div className="px-4 py-3 space-y-2">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-[#E53935]">{error}</p>
          </div>
        )}

        {!showSearchResults && recentFoods.length === 0 && (
          <EmptyState
            title="No recent foods"
            description="Foods you log will appear here for quick re-adding."
          />
        )}

        {showSearchResults && searchResults.length === 0 && historyResults.length === 0 && (
          <EmptyState
            title="No saved foods match"
            description="Press Search to look in Open Food Facts, or use Quick Add."
          />
        )}

        {showSearchResults && searchTerm && (
          <h2 className="text-sm font-medium text-[#757575] mt-2">
            Your foods
          </h2>
        )}

        {!showSearchResults && recentFoods.length > 0 && (
          <h2 className="text-sm font-medium text-[#757575] mt-2">
            Recent Foods
          </h2>
        )}

        {displayItems.map((item) => {
          if (item._type === 'food') {
            const food = item as Food & { _type: 'food' }
            return (
              <button
                key={food.id}
                onClick={() => handleFoodTap(food)}
                className="w-full bg-white rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-sm text-[#212121]">{food.name}</div>
                <div className="text-xs text-[#757575] mt-0.5">
                  {food.calories} cal{food.serving_size ? ` per ${food.serving_size}` : ''}{food.brand ? ` · ${food.brand}` : ''}
                </div>
              </button>
            )
          }

          const history = item as FoodRecent & { _type: 'history' }
          const added = quickAdded === history.food_name
          return (
            <div
              key={history.food_id || history.food_name}
              className="w-full bg-white rounded-lg flex items-stretch hover:bg-gray-50 transition-colors"
            >
              <button
                onClick={() => handleHistoryTap(history)}
                className="flex-1 p-3 text-left rounded-l-lg flex items-center gap-3"
              >
                {/* The picture you took last time, so a glance at the list is enough
                    (FF-0087). Hides itself when the file is gone rather than showing a
                    broken image. */}
                {history.photo_url && (
                  <img
                    src={foodLogPhotoUrl(history.photo_url)}
                    alt=""
                    aria-hidden="true"
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    onError={(event) => { event.currentTarget.style.display = 'none' }}
                  />
                )}
                <div className="min-w-0">
                  <div className="font-medium text-sm text-[#212121] truncate">{history.food_name}</div>
                  <div className="text-xs text-[#757575] mt-0.5">
                    {history.calories} cal{history.brand ? ` · ${history.brand}` : ''} · {history.total_logs} log{history.total_logs > 1 ? 's' : ''}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => void handleQuickLog(history)}
                aria-label={`Add ${history.food_name} to ${mealType}`}
                className="px-4 flex items-center justify-center rounded-r-lg border-l border-gray-100"
                style={{ color: added ? '#1a7f37' : '#185ADB' }}
              >
                {added ? (
                  <span className="text-xs font-semibold">Added</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
            </div>
          )
        })}
        {externalSearch && <ExternalFoodResults key={`${externalSearch.query}:${externalSearch.id}`}
          query={externalSearch.query} localFoods={foods} onSelect={selectExternal} />}
      </div>

      <BarcodeLookupModal
        isOpen={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        onFound={(food) => {
          setBarcodeOpen(false)
          // Same destination as tapping a searched food: the serving/meal screen.
          navigate(`/food/log/select/${food.id}?meal=${mealType}`, { state: originState })
        }}
      />
    </div>
  )
}
