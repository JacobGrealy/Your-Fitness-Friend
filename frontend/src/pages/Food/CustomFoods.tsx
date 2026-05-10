import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFoodStore } from '@/store/foodStore'
import type { FoodCreate } from '@/types'
import { customFoodSchema } from '@/utils/schemas'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Modal from '@/components/common/Modal'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'

export default function CustomFoods() {
  const { foods, isLoading, fetchFoods, createFood, deleteFood } = useFoodStore()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchFoods()
  }, [fetchFoods])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FoodCreate>({
    resolver: zodResolver(customFoodSchema),
    defaultValues: {
      name: '',
      calories: undefined,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      serving_size: '',
    },
  })

  const onAddSubmit = async (data: FoodCreate) => {
    await createFood(data)
    reset({
      name: '',
      calories: undefined,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      serving_size: '',
    })
    setIsAddModalOpen(false)
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteFood(deleteId)
      setDeleteId(null)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Custom Foods</h1>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
          Add Food
        </Button>
      </div>

      {isLoading && foods.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loading text="Loading foods..." />
        </div>
      ) : foods.length === 0 ? (
        <EmptyState
          title="No custom foods yet"
          description="Add custom foods to quickly log them when tracking meals."
          actionLabel="Add Food"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {foods.map(food => (
            <Card key={food.id} shadow>
              <div className="py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold">{food.name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      <span className="text-mfp-textSecondary">
                        <span className="font-medium">{food.calories}</span> cal
                      </span>
                      <span className="text-mfp-textSecondary">
                        <span className="font-medium">{food.protein_g}g</span> protein
                      </span>
                      <span className="text-mfp-textSecondary">
                        <span className="font-medium">{food.carbs_g}g</span> carbs
                      </span>
                      <span className="text-mfp-textSecondary">
                        <span className="font-medium">{food.fat_g}g</span> fat
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(food.id)}
                    className="text-mfp-error hover:text-mfp-error shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Custom Food"
        submitLabel="Add Food"
        onSubmit={handleSubmit(onAddSubmit)}
      >
        <form className="space-y-4" onSubmit={handleSubmit(onAddSubmit)}>
          <div>
            <label className="block text-sm font-medium text-mfp-text mb-2">Name</label>
            <input
              {...register('name')}
              placeholder="e.g. Grilled Chicken Breast"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white"
            />
            {errors.name?.message && (
              <p className="mt-1 text-xs text-mfp-error">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-mfp-text mb-2">Calories</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 165"
              {...register('calories')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white"
            />
            {errors.calories?.message && (
              <p className="mt-1 text-xs text-mfp-error">{errors.calories.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-mfp-text mb-2">Protein (g)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 31"
              {...register('protein_g')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white"
            />
            {errors.protein_g?.message && (
              <p className="mt-1 text-xs text-mfp-error">{errors.protein_g.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-mfp-text mb-2">Carbs (g)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 0"
              {...register('carbs_g')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white"
            />
            {errors.carbs_g?.message && (
              <p className="mt-1 text-xs text-mfp-error">{errors.carbs_g.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-mfp-text mb-2">Fat (g)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 3.6"
              {...register('fat_g')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white"
            />
            {errors.fat_g?.message && (
              <p className="mt-1 text-xs text-mfp-error">{errors.fat_g.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-mfp-text mb-2">Serving Size (optional)</label>
            <input
              placeholder="e.g. 100g"
              {...register('serving_size')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white"
            />
            {errors.serving_size?.message && (
              <p className="mt-1 text-xs text-mfp-error">{errors.serving_size.message}</p>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Food"
        submitLabel="Delete"
        onSubmit={handleDelete}
        submitDisabled={isLoading}
        submitLoading={isLoading}
      >
        <p className="text-mfp-textSecondary">
          Are you sure you want to delete this food? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
