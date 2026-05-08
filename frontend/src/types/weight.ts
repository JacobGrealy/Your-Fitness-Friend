/**
 * Weight tracking type definitions for the FitnessFriend frontend.
 *
 * These types represent weight logs, statistics, trends, and filtering
 * options for the weight tracking feature.
 */

/**
 * A single weight measurement log entry.
 * Mirrors the backend WeightLog model.
 */
export interface WeightLog {
  id: string
  user_id: string
  weight: number
  recorded_at: string
  notes: string | null
  photo_url: string | null
}

/**
 * Aggregate statistics computed from a set of weight logs.
 */
export interface WeightStatistics {
  current_weight: number | null
  average_weight: number | null
  min_weight: number | null
  max_weight: number | null
  count: number
}

/**
 * Weight trend analysis showing recent changes.
 */
export interface WeightTrend {
  current_weight: number | null
  previous_weight: number | null
  change_7d: number | null
  change_30d: number | null
  trend: 'up' | 'down' | 'stable' | null
}

/**
 * Data required to create a new weight log entry.
 */
export interface WeightLogCreate {
  weight: number
  date?: string
  photo?: File | null
  photo_url?: string | null
  notes?: string | null
}

/**
 * Filter options for querying weight logs.
 */
export interface WeightFilter {
  start_date?: string
  end_date?: string
}
