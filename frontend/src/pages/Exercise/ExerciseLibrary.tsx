import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useExerciseStore } from '@/store/exerciseStore'
import type { SavedExerciseCreate } from '@/types'
import { saveExerciseSchema } from '@/utils/schemas'
import { MUSCLE_GROUPS, EXERCISE_TYPES, MAX_EXERCISE_DESCRIPTION, MAX_EXERCISE_INSTRUCTIONS } from '@/utils/constants'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Select from '@/components/common/Select'
import TextArea from '@/components/common/TextArea'
import Card from '@/components/common/Card'
import Modal from '@/components/common/Modal'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'

export default function ExerciseLibrary() {
  const { savedExercises, isLoading, fetchSavedExercises, saveExercise, deleteSavedExercise } = useExerciseStore()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchSavedExercises()
  }, [fetchSavedExercises])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SavedExerciseCreate>({
    resolver: zodResolver(saveExerciseSchema),
    defaultValues: {
      name: '',
      muscle_group: undefined,
      type: undefined,
      description: '',
      instructions: '',
    },
  })

  const onAddSubmit = async (data: SavedExerciseCreate) => {
    await saveExercise(data)
    reset({
      name: '',
      muscle_group: undefined,
      type: undefined,
      description: '',
      instructions: '',
    })
    setIsAddModalOpen(false)
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteSavedExercise(deleteId)
      setDeleteId(null)
    }
  }

  const muscleGroupOptions = MUSCLE_GROUPS.map(g => ({
    value: g,
    label: g.charAt(0).toUpperCase() + g.slice(1).replace('_', ' '),
  }))

  const exerciseTypeOptions = EXERCISE_TYPES.map(t => ({
    value: t,
    label: t.charAt(0).toUpperCase() + t.slice(1),
  }))

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercise Library</h1>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
          Add Exercise
        </Button>
      </div>

      {isLoading && savedExercises.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loading text="Loading exercises..." />
        </div>
      ) : savedExercises.length === 0 ? (
        <EmptyState
          title="No exercises yet"
          description="Add exercises to your library to start tracking."
          actionLabel="Add Exercise"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {savedExercises.map(exercise => (
            <Card key={exercise.id} shadow className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{exercise.name}</span>
                  <span className="badge badge-secondary badge-sm capitalize">
                    {exercise.muscle_group?.replace('_', ' ')}
                  </span>
                  <span className="badge badge-ghost badge-sm capitalize">
                    {exercise.type}
                  </span>
                </div>
                {exercise.description && (
                  <p className="text-sm text-base-content/70 mt-1 truncate">
                    {exercise.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteId(exercise.id)}
                className="text-error hover:text-error shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Exercise"
        submitLabel="Save Exercise"
        onSubmit={handleSubmit(onAddSubmit)}
      >
        <form className="space-y-4" onSubmit={handleSubmit(onAddSubmit)}>
          <Input
            label="Name"
            placeholder="e.g. Bench Press"
            error={errors.name?.message}
            {...register('name')}
          />

          <Select
            label="Muscle Group"
            options={muscleGroupOptions}
            error={errors.muscle_group?.message}
            {...register('muscle_group')}
          />

          <Select
            label="Type"
            options={exerciseTypeOptions}
            error={errors.type?.message}
            {...register('type')}
          />

          <TextArea
            label="Description (optional)"
            placeholder="Brief description of the exercise"
            maxLength={MAX_EXERCISE_DESCRIPTION}
            error={errors.description?.message}
            {...register('description')}
          />

          <TextArea
            label="Instructions (optional)"
            placeholder="Step-by-step instructions"
            maxLength={MAX_EXERCISE_INSTRUCTIONS}
            rows={4}
            error={errors.instructions?.message}
            {...register('instructions')}
          />
        </form>
      </Modal>

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Exercise"
        submitLabel="Delete"
        onSubmit={handleDelete}
        submitDisabled={isLoading}
        submitLoading={isLoading}
      >
        <p className="text-base-content/70">
          Are you sure you want to delete this exercise? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
