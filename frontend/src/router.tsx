import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard'
import { Weight, LogWeight, WeightHistory, EditWeight, WeightLogView } from './pages/Weight'
import { Exercise, ExerciseLibrary, LogExercise } from './pages/Exercise'
import { DailyFood, LogFood, CustomFoods, PhotoLog, FoodLogSelect, EditFoodLog, EditFoodDetails } from './pages/Food'
import { Meals, UploadPhoto, PhotoGallery } from './pages/Meals'
import Profile from './pages/Profile'
import AuthGuard from './components/layout/AuthGuard'
import LogHealth from './pages/Health/LogHealth'
import FoodLogOptions from './pages/Food/FoodLogOptions'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'dashboard',
        element: (
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        ),
      },
      {
        path: 'weight',
        element: (
          <AuthGuard>
            <Weight />
          </AuthGuard>
        ),
      },
      {
        path: 'weight/log',
        element: (
          <AuthGuard>
            <LogWeight />
          </AuthGuard>
        ),
      },
      {
        path: 'weight/history',
        element: (
          <AuthGuard>
            <WeightHistory />
          </AuthGuard>
        ),
      },
      {
        // Read-only view; editing is an explicit step from here (FF-0074).
        path: 'weight/history/:id',
        element: (
          <AuthGuard>
            <WeightLogView />
          </AuthGuard>
        ),
      },
      {
        path: 'weight/history/:id/edit',
        element: (
          <AuthGuard>
            <EditWeight />
          </AuthGuard>
        ),
      },
      {
        path: 'health/log/:kind',
        element: <AuthGuard><LogHealth /></AuthGuard>,
      },
      {
        path: 'health/log/:kind/:id',
        element: <AuthGuard><LogHealth /></AuthGuard>,
      },
      {
        path: 'exercise',
        element: (
          <AuthGuard>
            <Exercise />
          </AuthGuard>
        ),
      },
      {
        path: 'exercise/library',
        element: (
          <AuthGuard>
            <ExerciseLibrary />
          </AuthGuard>
        ),
      },
      {
        path: 'exercise/log',
        element: (
          <AuthGuard>
            <LogExercise />
          </AuthGuard>
        ),
      },
      {
        path: 'exercise/history',
        element: (
          <AuthGuard>
            <Navigate to="/food/daily" replace />
          </AuthGuard>
        ),
      },
      {
        // /food used to render a second, stale diary. It is now only a redirect
        // so old bookmarks keep working (FF-0031).
        path: 'food',
        element: <Navigate to="/food/daily" replace />,
      },
      {
        path: 'food/daily',
        element: (
          <AuthGuard>
            <DailyFood />
          </AuthGuard>
        ),
      },
      {
        path: 'food/log/options',
        element: <AuthGuard><FoodLogOptions /></AuthGuard>,
      },
      {
        path: 'food/log',
        element: (
          <AuthGuard>
            <LogFood />
          </AuthGuard>
        ),
      },
      {
        path: 'food/log/select/:foodId?',
        element: (
          <AuthGuard>
            <FoodLogSelect />
          </AuthGuard>
        ),
      },
      {
        // Food details for an entry: name, brand, macros per serving - no serving count
        // (FF-0086).
        path: 'food/log/:id/food',
        element: (
          <AuthGuard>
            <EditFoodDetails />
          </AuthGuard>
        ),
      },
      {
        path: 'food/log/:id/edit',
        element: (
          <AuthGuard>
            <EditFoodLog />
          </AuthGuard>
        ),
      },
      {
        path: 'food/custom',
        element: (
          <AuthGuard>
            <CustomFoods />
          </AuthGuard>
        ),
      },
      {
        path: 'food/photo-log',
        element: (
          <AuthGuard>
            <PhotoLog />
          </AuthGuard>
        ),
      },
      {
        path: 'meals',
        element: (
          <AuthGuard>
            <Meals />
          </AuthGuard>
        ),
      },
      {
        path: 'meals/upload',
        element: (
          <AuthGuard>
            <UploadPhoto />
          </AuthGuard>
        ),
      },
      {
        path: 'meals/gallery',
        element: (
          <AuthGuard>
            <PhotoGallery />
          </AuthGuard>
        ),
      },
      {
        path: 'profile',
        element: (
          <AuthGuard>
            <Profile />
          </AuthGuard>
        ),
      },
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
  {
    path: 'auth/login',
    element: <Login />,
  },
  {
    path: 'auth/register',
    element: <Register />,
  },
])
