import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useExerciseStore } from '@/store/exerciseStore'
import type { SavedExerciseCreate } from '@/types'
import { saveExerciseSchema } from '@/utils/schemas'
import { MUSCLE_GROUPS, EXERCISE_TYPES, MAX_EXERCISE_DESCRIPTION, MAX_EXERCISE_INSTRUCTIONS } from '@/utils/constants'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Modal from '@/components/common/Modal'
import Loading from '@/components/common/Loading'
import EmptyState from '@/components/common/EmptyState'

const muscleGroupOptions = MUSCLE_GROUPS.map(g => ({
  value: g,
  label: g.charAt(0).toUpperCase() + g.slice(1).replace('_', ' '),
}))

const exerciseTypeOptions = EXERCISE_TYPES.map(t => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}))

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
            <Card key={exercise.id} className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{exercise.name}</span>
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-mfp-blue/10 text-mfp-blue rounded-md capitalize">
                    {exercise.muscle_group?.replace('_', ' ')}
                  </span>
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-200 text-mfp-textSecondary rounded-md capitalize">
                    {exercise.type}
                  </span>
                </div>
                {exercise.description && (
                  <p className="text-sm text-mfp-textSecondary mt-1 truncate">
                    {exercise.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteId(exercise.id)}
                className="text-mfp-error hover:text-mfp-error shrink-0"
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
          <div>
            <label className="block text-sm font-medium text-mfp-text mb-2">Name</label>
            <input
              {...register('name')}
              placeholder="e.g. Bench Press"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white"
            />
            {errors.name?.message && (
              <p className="mt-1 text-xs text-mfp-error">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-mfp-text mb-2">Muscle Group</label>
            <select
              {...register('muscle_group')}
              className={`w-full px-3 py-2.5 border border-${errors.muscle_group ? 'mfp-error' : 'gray-300'} rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white`}
            >
              <option value="">Select muscle group</option>
              {muscleGroupOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.muscle_group?.message && (
              <p className="mt-1 text-xs text-mfp-error">{errors.muscle_group.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-mfp-text mb-2">Type</label>
            <select
              {...register('type')}
              className={`w-full px-3 py-2.5 border border-${errors.type ? 'mfp-error' : 'gray-300'} rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white`}
            >
              <option value="">Select type</option>
              {exerciseTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.type?.message && (
              <p className="mt-1 text-xs text-mfp-error">{errors.type.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-mfp-text mb-2">Description (optional)</label>
            <textarea
              {...register('description')}
              placeholder="Brief description of the exercise"
              maxLength={MAX_EXERCISE_DESCRIPTION}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white resize-none"
            />
            {errors.description?.message && (
              <p className="mt-1 text-xs text-mfp-error">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-mfp-text mb-2">Instructions (optional)</label>
            <textarea
              {...register('instructions')}
              placeholder="Step-by-step instructions"
              maxLength={MAX_EXERCISE_INSTRUCTIONS}
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-mfp-text focus:border-mfp-blue focus:ring-1 focus:ring-mfp-blue outline-none bg-white resize-none"
            />
            {errors.instructions?.message && (
              <p className="mt-1 text-xs text-mfp-error">{errors.instructions.message}</p>
            )}
          </div>
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
        <p className="text-mfp-textSecondary">
          Are you sure you want to delete this exercise? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
