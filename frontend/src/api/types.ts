export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
}

export interface UserProfile {
  id: number
  username: string
  email: string
  age?: number
  gender?: string
  height?: number
  weight?: number
  activity_level?: string
  daily_calorie_goal?: number
  created_at?: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  code?: string
}
