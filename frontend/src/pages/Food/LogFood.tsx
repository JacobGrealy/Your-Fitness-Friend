import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFoodStore } from '@/store/foodStore'
import { usePageTitle } from '@/components/layout/PageTitleContext'
import type { Food, FoodRecent } from '@/types'
import { SEARCH_DEBOUNCE_MS } from '@/utils/constants'
import Button from '@/components/common/Button'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'

export default function LogFood() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const { foods, recentFoods, isLoading, error, fetchFoods, fetchRecentFoods, clearError } = useFoodStore()

  const [searchTerm, setSearchTerm] = useState('')
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
        f.name.toLowerCase().includes(term.toLowerCase())
      ).slice(0, 15)

      const matchingHistory = recentFoods.filter(h =>
        h.food_name.toLowerCase().includes(term.toLowerCase())
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
    setSearchResults([])
    setHistoryResults([])
    setShowSearchResults(false)
  }

  const handleFoodTap = (food: Food) => {
    navigate(`/food/log/select/${food.id}`)
  }

  const handleHistoryTap = (history: FoodRecent) => {
    const foodIdParam = history.food_id ? `&foodId=${history.food_id}` : ''
    navigate(
      `/food/log/select?name=${encodeURIComponent(history.food_name)}&calories=${history.calories}&protein=${history.protein_g}&carbs=${history.carbs_g}&fat=${history.fat_g}&brand=${encodeURIComponent(history.brand || '')}&barcode_id=${encodeURIComponent(history.barcode_id || '')}&serving_size=${encodeURIComponent(history.serving_size || '')}${foodIdParam}`
    )
  }

  const handleQuickAdd = () => {
    navigate('/food/log/select')
  }

  const handleFoodPhoto = () => {
    navigate('/food/photo-log')
  }

  if (isLoading && foods.length === 0 && recentFoods.length === 0) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex justify-center py-12">
        <Loading text="Loading..." />
      </div>
    )
  }

  const displayItems = showSearchResults
    ? [
        ...historyResults.map(h => ({ ...h, _type: 'history' as const })),
        ...searchResults.map(f => ({ ...f, _type: 'food' as const })),
      ]
    : recentFoods.map(h => ({ ...h, _type: 'history' as const }))

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Sticky Top Zone */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e0e0e0]">
        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
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
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-3 flex gap-2">
          <Button size="sm" onClick={handleQuickAdd}>
            Quick Add
          </Button>
          <Button size="sm" variant="outline" onClick={handleFoodPhoto}>
            Food Photo
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
            title="No results"
            description="Try a different search term."
          />
        )}

        {showSearchResults && searchTerm && (
          <h2 className="text-sm font-medium text-[#757575] mt-2">
            Search Results
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
                  {food.calories} cal{food.brand ? ` · ${food.brand}` : ''}
                </div>
              </button>
            )
          }

          const history = item as FoodRecent & { _type: 'history' }
          return (
            <button
              key={history.food_name}
              onClick={() => handleHistoryTap(history)}
              className="w-full bg-white rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-sm text-[#212121]">{history.food_name}</div>
              <div className="text-xs text-[#757575] mt-0.5">
                {history.calories} cal{history.brand ? ` · ${history.brand}` : ''} · {history.total_logs} log{history.total_logs > 1 ? 's' : ''}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
