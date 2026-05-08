/**
 * User-related type definitions for the FitnessFriend frontend.
 *
 * These types represent the core user entity, authentication responses,
 * and data used during registration and login flows.
 */

/**
 * Full user profile with fitness preferences and goals.
 * Mirrors the backend User model.
 */
export interface User {
  id: string
  username: string
  email: string
  age: number | null
  gender: 'male' | 'female' | 'other'
  height: number | null
  weight: number | null
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  daily_calorie_goal: number | null
}

/**
 * Lightweight user profile used in auth store and API responses.
 * Mirrors the backend UserProfile model.
 */
export interface UserProfile {
  id: string
  username: string
  email: string
  age: number | null
  gender: 'male' | 'female' | 'other'
  height: number | null
  weight: number | null
}

/**
 * Response returned after successful authentication.
 * Contains the JWT access token and the authenticated user.
 */
export interface AuthResponse {
  access_token: string
  user: User
}

/**
 * Data required for user registration.
 * All fields are sent as part of a POST to the register endpoint.
 */
export interface RegisterData {
  username: string
  email: string
  password: string
  age: number | null
  gender: 'male' | 'female' | 'other'
  height: number | null
  weight: number | null
}

/**
 * Data required for user login.
 */
export interface LoginData {
  username: string
  password: string
}
