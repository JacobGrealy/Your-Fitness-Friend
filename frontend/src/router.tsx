import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard'
import { Weight, LogWeight, WeightHistory, EditWeight } from './pages/Weight'
import { Exercise, ExerciseLibrary, LogExercise, ExerciseHistory } from './pages/Exercise'
import { Food, DailyFood, LogFood, CustomFoods } from './pages/Food'
import { Meals, UploadPhoto, PhotoGallery } from './pages/Meals'
import Profile from './pages/Profile'
import AuthGuard from './components/layout/AuthGuard'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'auth/login',
        element: <Login />,
      },
      {
        path: 'auth/register',
        element: <Register />,
      },
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
        path: 'weight/history/:id/edit',
        element: (
          <AuthGuard>
            <EditWeight />
          </AuthGuard>
        ),
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
            <ExerciseHistory />
          </AuthGuard>
        ),
      },
      {
        path: 'food',
        element: (
          <AuthGuard>
            <Food />
          </AuthGuard>
        ),
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
        path: 'food/log',
        element: (
          <AuthGuard>
            <LogFood />
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
        element: <Navigate to="/auth/login" replace />,
      },
    ],
  },
])
