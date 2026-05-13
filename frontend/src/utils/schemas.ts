import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const logWeightSchema = z.object({
  weight: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().positive('Weight must be a positive number')),
  date: z.string().optional(),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
})

export const saveExerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  muscle_group: z.union([
    z.literal('chest'),
    z.literal('back'),
    z.literal('legs'),
    z.literal('shoulders'),
    z.literal('arms'),
    z.literal('core'),
    z.literal('full_body'),
  ]).optional(),
  type: z.union([
    z.literal('cardio'),
    z.literal('strength'),
    z.literal('flexibility'),
    z.literal('other'),
  ]).optional(),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
  instructions: z.string().max(2000, 'Instructions must be at most 2000 characters').optional(),
})

export const logExerciseSchema = z.object({
  exercise_id: z.string().min(1, 'Exercise is required'),
  duration_minutes: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().positive('Duration must be a positive number')),
  intensity: z.union([
    z.literal('low'),
    z.literal('medium'),
    z.literal('high'),
  ]).optional(),
  sets: z.preprocess(
    (val) => val === '' ? undefined : val,
    z.coerce.number()
      .int('Sets must be a whole number')
      .positive('Sets must be a positive number')
      .optional()
  ),
  reps: z.preprocess(
    (val) => val === '' ? undefined : val,
    z.coerce.number()
      .int('Reps must be a whole number')
      .positive('Reps must be a positive number')
      .optional()
  ),
  weight_lbs: z.preprocess(
    (val) => val === '' ? undefined : val,
    z.coerce.number()
      .positive('Weight must be a positive number')
      .optional()
  ),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
})

export const customFoodSchema = z.object({
  name: z.string().min(1, 'Food name is required'),
  calories: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().positive('Calories must be a positive number')),
  protein_g: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().nonnegative('Protein must be a non-negative number')),
  carbs_g: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().nonnegative('Carbs must be a non-negative number')),
  fat_g: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().nonnegative('Fat must be a non-negative number')),
  serving_size: z.string().optional(),
})

export const logFoodSchema = z.object({
  food_id: z.string().min(1, 'Food is required'),
  quantity: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().positive('Quantity must be a positive number')).default(1),
  meal_type: z.union([
    z.literal('breakfast'),
    z.literal('lunch'),
    z.literal('dinner'),
    z.literal('snack'),
  ]),
})

export const quickAddFoodSchema = z.object({
  name: z.string().optional(),
  calories: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().positive('Calories must be a positive number')),
  protein_g: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().nonnegative('Protein must be a non-negative number'))
    .optional(),
  carbs_g: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().nonnegative('Carbs must be a non-negative number'))
    .optional(),
  fat_g: z.coerce.number()
    .refine((val) => !Number.isNaN(val), { message: 'Expected number, received nan' })
    .pipe(z.number().nonnegative('Fat must be a non-negative number'))
    .optional(),
  brand: z.string().max(100, 'Brand must be at most 100 characters').optional(),
  barcode_id: z.string().max(100, 'Barcode ID must be at most 100 characters').optional(),
  serving_size: z.string().optional(),
  meal_type: z.union([
    z.literal('breakfast'),
    z.literal('lunch'),
    z.literal('dinner'),
    z.literal('snack'),
  ]),
})
