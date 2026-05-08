import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMealsStore } from '@/store/mealsStore'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import { formatDate } from '@/utils/formatters'
import type { MealPhoto } from '@/types'

function getTodayPhotos(photos: MealPhoto[]): MealPhoto[] {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return photos.filter(p => p.date === todayStr)
}

function getRecentPhotos(photos: MealPhoto[], limit: number): MealPhoto[] {
  return [...photos]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}

export default function Meals() {
  const navigate = useNavigate()
  const { photos, isLoading, fetchPhotos } = useMealsStore()

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  const todayPhotos = getTodayPhotos(photos)
  const todayCalories = todayPhotos.reduce(
    (sum, p) => sum + (p.estimated_calories ?? 0),
    0
  )
  const recentPhotos = getRecentPhotos(photos, 4)

  if (isLoading && photos.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Meal Photos</h1>
        <div className="flex justify-center py-12">
          <Loading text="Loading meal data..." />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Meal Photos</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card shadow className="text-center">
          <div className="card-body items-center py-4">
            <p className="text-sm text-base-content/60">Photos Today</p>
            <p className="text-2xl font-bold">{todayPhotos.length}</p>
          </div>
        </Card>

        <Card shadow className="text-center">
          <div className="card-body items-center py-4">
            <p className="text-sm text-base-content/60">Calories Today</p>
            <p className="text-2xl font-bold">{todayCalories} cal</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="primary"
          fullWidth
          onClick={() => navigate('/meals/upload')}
        >
          Upload Photo
        </Button>
        <Button
          variant="outline"
          fullWidth
          onClick={() => navigate('/meals/gallery')}
        >
          View Gallery
        </Button>
      </div>

      <h2 className="text-lg font-bold mt-4">Recent Photos</h2>

      {recentPhotos.length === 0 ? (
        <EmptyState
          title="No photos yet"
          description="Upload your first meal photo to track your food."
          actionLabel="Upload Photo"
          onAction={() => navigate('/meals/upload')}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {recentPhotos.map((photo) => (
            <Card key={photo.id} shadow>
              <figure>
                <img
                  src={photo.photo_path}
                  alt={`Meal from ${formatDate(photo.date)}`}
                  className="w-full h-28 object-cover rounded-t-lg"
                />
              </figure>
              <div className="card-body py-2 px-3">
                <p className="text-xs text-base-content/60">{formatDate(photo.date)}</p>
                {photo.estimated_calories !== null && (
                  <p className="text-sm font-semibold">{photo.estimated_calories} cal</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
