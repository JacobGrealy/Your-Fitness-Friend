import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMealsStore } from '@/store/mealsStore'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'
import Modal from '@/components/common/Modal'
import { formatDate } from '@/utils/formatters'
import type { MealPhoto } from '@/types'

export default function PhotoGallery() {
  const navigate = useNavigate()
  const { photos, isLoading, fetchPhotos, deletePhoto } = useMealsStore()

  const [deleteTarget, setDeleteTarget] = useState<MealPhoto | null>(null)
  const [expandedPhoto, setExpandedPhoto] = useState<MealPhoto | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  const sortedPhotos = [...photos].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await deletePhoto(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Photo Gallery</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/meals')}>
          Back
        </Button>
      </div>

      {isLoading && photos.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loading text="Loading photos..." />
        </div>
      ) : sortedPhotos.length === 0 ? (
        <EmptyState
          title="No photos yet"
          description="Upload your first meal photo to get started."
          actionLabel="Upload Photo"
          onAction={() => navigate('/meals/upload')}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedPhotos.map((photo) => (
            <Card key={photo.id} shadow className="hover:shadow-lg transition-shadow">
              <figure className="relative">
                <button
                  onClick={() => setExpandedPhoto(photo)}
                  className="w-full cursor-pointer"
                >
                  <img
                    src={photo.photo_path}
                    alt={`Meal from ${formatDate(photo.date)}`}
                    className="w-full h-32 sm:h-40 object-cover rounded-t-lg"
                  />
                </button>
                {photo.estimated_calories !== null && (
                  <div className="absolute top-2 right-2 badge badge-primary badge-sm">
                    {photo.estimated_calories} cal
                  </div>
                )}
              </figure>
              <div className="card-body py-2 px-3">
                <p className="text-xs text-base-content/60">{formatDate(photo.date)}</p>
                {photo.estimated_protein !== null && (
                  <p className="text-xs text-base-content/50">
                    P:{photo.estimated_protein}g C:{photo.estimated_carbs ?? 0}g F:{photo.estimated_fat ?? 0}g
                  </p>
                )}
                <div className="card-actions mt-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-error"
                    onClick={() => setDeleteTarget(photo)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Photo"
        submitLabel="Delete"
        submitLoading={isDeleting}
        onSubmit={handleDelete}
      >
        <p className="text-base-content/70">
          Are you sure you want to delete this meal photo? This action cannot be undone.
        </p>
      </Modal>

      <Modal
        isOpen={!!expandedPhoto}
        onClose={() => setExpandedPhoto(null)}
        title={expandedPhoto ? formatDate(expandedPhoto.date) : ''}
      >
        {expandedPhoto && (
          <div className="space-y-3">
            <img
              src={expandedPhoto.photo_path}
              alt="Expanded meal photo"
              className="w-full max-h-[400px] object-contain rounded-lg bg-base-200"
            />
            {expandedPhoto.estimated_calories !== null && (
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-sm text-base-content/60">Calories</p>
                  <p className="text-lg font-bold">{expandedPhoto.estimated_calories} cal</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-base-content/60">Protein</p>
                  <p className="text-lg font-bold">{expandedPhoto.estimated_protein ?? 0}g</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-base-content/60">Carbs</p>
                  <p className="text-lg font-bold">{expandedPhoto.estimated_carbs ?? 0}g</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-base-content/60">Fat</p>
                  <p className="text-lg font-bold">{expandedPhoto.estimated_fat ?? 0}g</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
