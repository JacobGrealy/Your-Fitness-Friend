import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  birthdate: z.string().optional(),
  gender: z.string().optional(),
  heightFt: z.string().optional(),
  heightIn: z.string().optional(),
  weight: z.string().optional(),
  activityLevel: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

function RegisterForm() {
  const navigate = useNavigate()
  const { register: registerUser, error, isLoading } = useAuthStore()
  const [localError, setLocalError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setLocalError(null)
    try {
      const payload: Record<string, any> = {
        email: data.email,
        password: data.password,
        name: data.name,
      }

      // Add profile fields if provided
      if (data.birthdate) payload.birthdate = data.birthdate
      if (data.gender) payload.gender = data.gender
      if (data.heightFt && data.heightIn) {
        const heightCm = (parseInt(data.heightFt) * 12 + parseInt(data.heightIn)) * 2.54
        payload.height = heightCm
      }
      if (data.weight) {
        payload.weight = parseFloat(data.weight) / 2.20462
      }
      if (data.activityLevel) payload.activity_level = data.activityLevel

      await registerUser(data.email, data.password, data.name, payload)
      setLocalError(null)
      navigate('/auth/login')
    } catch (err) {
      setLocalError(error || 'Registration failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 px-4">
      <div className="w-full max-w-md space-y-8 rounded-box bg-base-100 p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Create account</h2>
          <p className="mt-2 text-base-content/70">Start your fitness journey</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {localError && (
            <div className="alert alert-error text-base-content">
              <span>{localError}</span>
            </div>
          )}

          <div className="form-control">
            <label className="label">
              <span className="label-text">Name</span>
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              className="input input-bordered w-full"
              {...register('name')}
            />
            {errors.name && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.name.message}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="input input-bordered w-full"
              {...register('email')}
            />
            {errors.email && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.email.message}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Password</span>
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              className="input input-bordered w-full"
              {...register('password')}
            />
            {errors.password && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.password.message}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Confirm Password</span>
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              className="input input-bordered w-full"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.confirmPassword.message}</span>
              </label>
            )}
          </div>

          {/* Profile Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Profile (optional)</h3>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Birth Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                {...register('birthdate')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Gender</span>
              </label>
              <select className="select select-bordered" {...register('gender')}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Height (ft)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  {...register('heightFt')}
                  min="1"
                  max="9"
                  placeholder="5"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Height (in)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  {...register('heightIn')}
                  min="0"
                  max="11"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Weight (lbs)</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                {...register('weight')}
                step="0.1"
                min="0"
                placeholder="180"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Activity Level</span>
              </label>
              <select className="select select-bordered" {...register('activityLevel')}>
                <option value="">Select activity level</option>
                <option value="sedentary">Sedentary - Little or no exercise, desk job</option>
                <option value="light">Light - Light exercise 1-3 days/week</option>
                <option value="moderate">Moderate - Moderate exercise 3-5 days/week</option>
                <option value="active">Active - Hard exercise 6-7 days/week</option>
                <option value="very active">Very Active - Very hard exercise, physical job</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>

          <div className="text-center">
            <button type="button" onClick={() => navigate('/auth/login')} className="link link-primary">
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterForm
