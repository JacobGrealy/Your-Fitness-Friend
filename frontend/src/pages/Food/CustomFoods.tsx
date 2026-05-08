import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFoodStore } from '@/store/foodStore'
import type { FoodCreate } from '@/types'
import { customFoodSchema } from '@/utils/schemas'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
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
              <div className="card-body py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold">{food.name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      <span className="text-base-content/70">
                        <span className="font-medium">{food.calories}</span> cal
                      </span>
                      <span className="text-base-content/70">
                        <span className="font-medium">{food.protein_g}g</span> protein
                      </span>
                      <span className="text-base-content/70">
                        <span className="font-medium">{food.carbs_g}g</span> carbs
                      </span>
                      <span className="text-base-content/70">
                        <span className="font-medium">{food.fat_g}g</span> fat
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(food.id)}
                    className="text-error hover:text-error shrink-0"
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
          <Input
            label="Name"
            placeholder="e.g. Grilled Chicken Breast"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Calories"
            type="number"
            min="1"
            placeholder="e.g. 165"
            error={errors.calories?.message}
            {...register('calories')}
          />

          <Input
            label="Protein (g)"
            type="number"
            min="0"
            step="0.1"
            placeholder="e.g. 31"
            error={errors.protein_g?.message}
            {...register('protein_g')}
          />

          <Input
            label="Carbs (g)"
            type="number"
            min="0"
            step="0.1"
            placeholder="e.g. 0"
            error={errors.carbs_g?.message}
            {...register('carbs_g')}
          />

          <Input
            label="Fat (g)"
            type="number"
            min="0"
            step="0.1"
            placeholder="e.g. 3.6"
            error={errors.fat_g?.message}
            {...register('fat_g')}
          />

          <Input
            label="Serving Size (optional)"
            placeholder="e.g. 100g"
            error={errors.serving_size?.message}
            {...register('serving_size')}
          />
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
        <p className="text-base-content/70">
          Are you sure you want to delete this food? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
