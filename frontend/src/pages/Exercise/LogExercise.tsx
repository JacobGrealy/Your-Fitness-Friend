import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useExerciseStore } from '@/store/exerciseStore'
import type { ExerciseLogCreate } from '@/types'
import { logExerciseSchema } from '@/utils/schemas'
import { INTENSITIES, MAX_EXERCISE_LOG_NOTES } from '@/utils/constants'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Select from '@/components/common/Select'
import TextArea from '@/components/common/TextArea'

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

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Log Exercise</h1>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Exercise"
          options={exerciseOptions}
          error={errors.exercise_id?.message}
          {...register('exercise_id')}
        />

        <Input
          label="Duration (minutes)"
          type="number"
          min="1"
          placeholder="e.g. 30"
          error={errors.duration_minutes?.message}
          {...register('duration_minutes')}
        />

        <Select
          label="Intensity"
          options={intensityOptions}
          error={errors.intensity?.message}
          {...register('intensity')}
        />

        <Input
          label="Sets (optional)"
          type="number"
          min="1"
          placeholder="e.g. 3"
          error={errors.sets?.message}
          {...register('sets')}
        />

        <Input
          label="Reps (optional)"
          type="number"
          min="1"
          placeholder="e.g. 12"
          error={errors.reps?.message}
          {...register('reps')}
        />

        <Input
          label="Weight (lbs, optional)"
          type="number"
          step="0.5"
          placeholder="e.g. 132"
          error={errors.weight_lbs?.message}
          {...register('weight_lbs')}
        />

        <TextArea
          label="Notes (optional)"
          placeholder="How did the session go?"
          maxLength={MAX_EXERCISE_LOG_NOTES}
          error={errors.notes?.message}
          {...register('notes')}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isLoading}
        >
          Log Exercise
        </Button>
      </form>
    </div>
  )
}
