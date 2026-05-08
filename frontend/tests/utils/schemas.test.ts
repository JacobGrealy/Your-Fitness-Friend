import {
  registerSchema,
  loginSchema,
  logWeightSchema,
  saveExerciseSchema,
  logExerciseSchema,
  customFoodSchema,
  logFoodSchema,
} from '@/utils/schemas'

describe('Zod validation schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid data', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'not-an-email',
        password: 'Password1',
        confirmPassword: 'Password1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email')
      }
    })

    it('rejects password too short', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Pas1',
        confirmPassword: 'Pas1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password')
      }
    })

    it('rejects when passwords do not match', () => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password1',
        confirmPassword: 'Different1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword')
      }
    })
  })

  describe('loginSchema', () => {
    it('accepts valid data', () => {
      const result = loginSchema.safeParse({
        email: 'john@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('logWeightSchema', () => {
    it('accepts valid data', () => {
      const result = logWeightSchema.safeParse({
        weight: 75.5,
      })
      expect(result.success).toBe(true)
    })

    it('rejects negative weight', () => {
      const result = logWeightSchema.safeParse({
        weight: -5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('saveExerciseSchema', () => {
    it('accepts valid data', () => {
      const result = saveExerciseSchema.safeParse({
        name: 'Push-ups',
        muscle_group: 'chest',
        type: 'strength',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('logExerciseSchema', () => {
    it('accepts valid data', () => {
      const result = logExerciseSchema.safeParse({
        exercise_id: 'ex-1',
        duration_minutes: 30,
        intensity: 'medium',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('customFoodSchema', () => {
    it('accepts valid data', () => {
      const result = customFoodSchema.safeParse({
        name: 'Banana',
        calories: 105,
        protein_g: 1.3,
        carbs_g: 27,
        fat_g: 0.3,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('logFoodSchema', () => {
    it('accepts valid data', () => {
      const result = logFoodSchema.safeParse({
        food_id: 'food-1',
        meal_type: 'breakfast',
      })
      expect(result.success).toBe(true)
    })
  })
})
