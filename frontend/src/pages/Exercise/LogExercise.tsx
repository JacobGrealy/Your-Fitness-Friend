import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useExerciseStore } from '@/store/exerciseStore'
import type { ExerciseLogCreate } from '@/types'
import { logExerciseSchema } from '@/utils/schemas'
import { INTENSITIES, MAX_EXERCISE_LOG_NOTES } from '@/utils/constants'
import Header from '@/components/layout/Header'

type LogExerciseFormData = ExerciseLogCreate & { notes?: string }

export default function LogExercise() {
  const navigate = useNavigate()
  const { savedExercises, logExercise, error, isLoading } = useExerciseStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LogExerciseFormData>({
    resolver: zodResolver(logExerciseSchema),
    defaultValues: {
      exercise_id: '',
      duration_minutes: undefined,
      intensity: undefined,
      sets: undefined,
      reps: undefined,
      weight_lbs: undefined,
      notes: '',
    },
  })

  const onSubmit = async (data: LogExerciseFormData) => {
    await logExercise(data)
    navigate(-1)
  }

  const exerciseOptions = savedExercises.map(ex => ({
    value: ex.id,
    label: ex.name,
  }))

  const intensityOptions = INTENSITIES.map(i => ({
    value: i,
    label: i.charAt(0).toUpperCase() + i.slice(1),
  }))

  const inputClass = "w-full border border-mfp-border rounded-lg px-3 py-2 text-mfp-text bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-mfp-blue focus:border-transparent"

  return (
    <>
      <Header title="Log Exercise" showBack />
      <main className="bg-white min-h-screen pb-20 sm:pb-0 pt-14 sm:pt-0">
        {error && (
          <div className="px-4 pt-4">
            <div className="bg-mfp-error/10 border border-mfp-error/20 rounded-lg p-3">
              <p className="text-sm text-mfp-error">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="px-4 pt-4 space-y-4">
          {/* Exercise */}
          <div className="bg-white rounded-lg p-4 border border-mfp-border">
            <label className="block text-sm font-medium text-mfp-text mb-1">
              Exercise
            </label>
            <select
              {...register('exercise_id')}
              className={`${inputClass} ${errors.exercise_id ? 'border-mfp-error' : ''}`}
            >
              <option value="">Select an exercise</option>
              {exerciseOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.exercise_id && (
              <p className="mt-1 text-xs text-mfp-error">{errors.exercise_id.message}</p>
            )}
          </div>

          {/* Duration */}
          <div className="bg-white rounded-lg p-4 border border-mfp-border">
            <label className="block text-sm font-medium text-mfp-text mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 30"
              {...register('duration_minutes')}
              className={`${inputClass} ${errors.duration_minutes ? 'border-mfp-error' : ''}`}
            />
            {errors.duration_minutes && (
              <p className="mt-1 text-xs text-mfp-error">{errors.duration_minutes.message}</p>
            )}
          </div>

          {/* Intensity */}
          <div className="bg-white rounded-lg p-4 border border-mfp-border">
            <label className="block text-sm font-medium text-mfp-text mb-1">
              Intensity
            </label>
            <select
              {...register('intensity')}
              className={`${inputClass} ${errors.intensity ? 'border-mfp-error' : ''}`}
            >
              <option value="">Select intensity</option>
              {intensityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.intensity && (
              <p className="mt-1 text-xs text-mfp-error">{errors.intensity.message}</p>
            )}
          </div>

          {/* Sets, Reps, Weight */}
          <div className="bg-white rounded-lg p-4 border border-mfp-border space-y-4">
            <div>
              <label className="block text-sm font-medium text-mfp-text mb-1">
                Sets (optional)
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 3"
                {...register('sets')}
                className={`${inputClass} ${errors.sets ? 'border-mfp-error' : ''}`}
              />
              {errors.sets && (
                <p className="mt-1 text-xs text-mfp-error">{errors.sets.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-mfp-text mb-1">
                Reps (optional)
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 12"
                {...register('reps')}
                className={`${inputClass} ${errors.reps ? 'border-mfp-error' : ''}`}
              />
              {errors.reps && (
                <p className="mt-1 text-xs text-mfp-error">{errors.reps.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-mfp-text mb-1">
                Weight (lbs, optional)
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 132"
                {...register('weight_lbs')}
                className={`${inputClass} ${errors.weight_lbs ? 'border-mfp-error' : ''}`}
              />
              {errors.weight_lbs && (
                <p className="mt-1 text-xs text-mfp-error">{errors.weight_lbs.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg p-4 border border-mfp-border">
            <label className="block text-sm font-medium text-mfp-text mb-1">
              Notes (optional)
            </label>
            <textarea
              placeholder="How did the session go?"
              maxLength={MAX_EXERCISE_LOG_NOTES}
              rows={3}
              {...register('notes')}
              className={`${inputClass} ${errors.notes ? 'border-mfp-error' : ''}`}
            />
            {errors.notes && (
              <p className="mt-1 text-xs text-mfp-error">{errors.notes.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-mfp-blue text-white font-medium py-3 rounded-lg hover:bg-mfp-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isLoading ? 'Logging...' : 'Log Exercise'}
          </button>
        </form>
      </main>
    </>
  )
}
