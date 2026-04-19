#!/bin/bash

# Fitness Friend Frontend Setup Script
# Run from the project root directory

set -e

echo "🚀 Setting up Fitness Friend Frontend..."

# Create frontend directory
echo "📁 Creating frontend directory structure..."
mkdir -p frontend/src/{api,components/{common,layout,charts},hooks,pages/{Auth,Weight,Exercise,Food,Meals},store,types,utils}
mkdir -p frontend/public/icons
mkdir -p frontend/tests/{api,components,pages}

# Create package.json
echo "📦 Creating package.json..."
cat > frontend/package.json << 'EOF'
{
  "name": "fitness-friend-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "jest"
  },
  "dependencies": {
    "axios": "1.14.0",
    "date-fns": "3.0.6",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-hook-form": "7.49.2",
    "react-router-dom": "6.21.0",
    "recharts": "2.10.3",
    "zustand": "4.4.7"
  },
  "devDependencies": {
    "@hookform/resolvers": "3.3.3",
    "@testing-library/jest-dom": "6.1.6",
    "@testing-library/react": "14.1.2",
    "@types/jest": "29.5.11",
    "@types/node": "20.10.6",
    "@types/react": "18.2.47",
    "@types/react-dom": "18.2.18",
    "@typescript-eslint/eslint-plugin": "6.17.0",
    "@typescript-eslint/parser": "6.17.0",
    "@vitejs/plugin-react": "4.2.1",
    "autoprefixer": "10.4.16",
    "daisyui": "4.4.19",
    "eslint": "8.56.0",
    "eslint-plugin-react-hooks": "4.6.0",
    "eslint-plugin-react-refresh": "0.4.5",
    "jest": "29.7.0",
    "postcss": "8.4.32",
    "tailwindcss": "3.4.0",
    "ts-jest": "29.1.1",
    "typescript": "5.3.3",
    "vite": "5.0.11",
    "vite-plugin-pwa": "0.17.4",
    "zod": "3.22.4"
  }
}
EOF

# Create vite.config.ts
echo "⚡ Creating vite.config.ts..."
cat > frontend/vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.svg'],
      manifest: {
        name: 'Fitness Friend',
        short_name: 'FitnessFriend',
        description: 'Track your fitness journey',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
EOF

# Create tailwind.config.js
echo "🎨 Creating tailwind.config.js..."
cat > frontend/tailwind.config.js << 'EOF'
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["dark", "light"],
    defaultTheme: "dark",
  },
}
EOF

# Create postcss.config.js
echo "📝 Creating postcss.config.js..."
cat > frontend/postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# Create tsconfig.json
echo "🔧 Creating tsconfig.json..."
cat > frontend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# Create tsconfig.node.json
cat > frontend/tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

# Create .gitignore
echo "🚫 Creating .gitignore..."
cat > frontend/.gitignore << 'EOF'
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

node_modules
dist
dist-ssr
*.local

# Editor files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store

# Environment files
.env
.env.local
.env.production

# Test coverage
coverage/
build/
EOF

# Create .env.example
echo "🔐 Creating .env.example..."
cat > frontend/.env.example << 'EOF'
VITE_API_BASE_URL=http://localhost:5000/api
EOF

# Create source files
echo "📄 Creating source files..."

# src/vite-env.d.ts
cat > frontend/src/vite-env.d.ts << 'EOF'
/// <reference types="vite/client" />
EOF

# src/index.css
cat > frontend/src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

body {
  margin: 0;
  min-height: 100vh;
}

#root {
  min-height: 100vh;
}
EOF

# src/main.tsx
cat > frontend/src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# src/App.tsx
cat > frontend/src/App.tsx << 'EOF'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

function App() {
  return <RouterProvider router={router} />
}

export default App
EOF

# src/router.tsx
cat > frontend/src/router.tsx << 'EOF'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard'

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
        element: <Dashboard />,
      },
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
])
EOF

# src/index.css
cat > frontend/src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

body {
  margin: 0;
  min-height: 100vh;
}

#root {
  min-height: 100vh;
}
EOF

# src/api/client.ts
cat > frontend/src/api/client.ts << 'EOF'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

export default api
EOF

# src/api/types.ts
cat > frontend/src/api/types.ts << 'EOF'
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
  id: string
  email: string
  name: string
  created_at: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  code?: string
}
EOF

# src/api/auth.ts
cat > frontend/src/api/auth.ts << 'EOF'
import api from './client'
import { LoginCredentials, RegisterData, UserProfile } from './types'

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  logout: async () => {
    await api.post('/auth/logout')
  },

  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/auth/profile')
    return response.data
  },
}
EOF

# src/components/layout/Layout.tsx
cat > frontend/src/components/layout/Layout.tsx << 'EOF'
import { Outlet } from 'react-router-dom'

function Layout() {
  return (
    <div className="min-h-screen bg-base-200">
      <Outlet />
    </div>
  )
}

export default Layout
EOF

# src/store/authStore.ts
cat > frontend/src/store/authStore.ts << 'EOF'
import { create } from 'zustand'
import { authApi } from '@/api/auth'
import { UserProfile } from '@/api/types'

interface AuthState {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.login({ email, password })
      const { token, user } = response.data
      localStorage.setItem('token', token)
      set({ 
        token, 
        user,
        isAuthenticated: true,
        isLoading: false 
      })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Login failed',
        isLoading: false 
      })
      throw error
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.register({ email, password, name })
      const { token, user } = response.data
      localStorage.setItem('token', token)
      set({ 
        token, 
        user,
        isAuthenticated: true,
        isLoading: false 
      })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Registration failed',
        isLoading: false 
      })
      throw error
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      set({ 
        user: null, 
        token: null, 
        isAuthenticated: false,
        error: null 
      })
    }
  },

  clearError: () => set({ error: null }),
}))
EOF

# src/store/themeStore.ts
cat > frontend/src/store/themeStore.ts << 'EOF'
import { create } from 'zustand'

interface ThemeState {
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}))
EOF

# src/pages/Auth/Login.tsx
cat > frontend/src/pages/Auth/Login.tsx << 'EOF'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginForm() {
  const navigate = useNavigate()
  const { login, error, isLoading } = useAuthStore()
  const [localError, setLocalError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLocalError(null)
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      setLocalError(error || 'Login failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 px-4">
      <div className="w-full max-w-md space-y-8 rounded-box bg-base-100 p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Welcome back</h2>
          <p className="mt-2 text-base-content/70">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {localError && (
            <div className="alert alert-error text-base-content">
              <span>{localError}</span>
            </div>
          )}

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

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center">
            <a href="/auth/register" className="link link-primary">
              Don't have an account? Sign up
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginForm
EOF

# src/pages/Auth/Register.tsx
cat > frontend/src/pages/Auth/Register.tsx << 'EOF'
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
      await registerUser(data.email, data.password, data.name)
      navigate('/dashboard')
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

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>

          <div className="text-center">
            <a href="/auth/login" className="link link-primary">
              Already have an account? Sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterForm
EOF

# src/pages/Dashboard.tsx
cat > frontend/src/pages/Dashboard.tsx << 'EOF'
function Dashboard() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2">Welcome to your fitness dashboard!</p>
    </div>
  )
}

export default Dashboard
EOF

# src/pages/Weight/Weight.tsx
cat > frontend/src/pages/Weight/Weight.tsx << 'EOF'
function Weight() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Weight Tracking</h1>
    </div>
  )
}

export default Weight
EOF

# src/pages/Exercise/Exercise.tsx
cat > frontend/src/pages/Exercise/Exercise.tsx << 'EOF'
function Exercise() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Exercise Tracking</h1>
    </div>
  )
}

export default Exercise
EOF

# src/pages/Food/Food.tsx
cat > frontend/src/pages/Food/Food.tsx << 'EOF'
function Food() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Food Tracking</h1>
    </div>
  )
}

export default Food
EOF

# src/pages/Meals/Meals.tsx
cat > frontend/src/pages/Meals/Meals.tsx << 'EOF'
function Meals() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Meal Photos</h1>
    </div>
  )
}

export default Meals
EOF

# index.html
cat > frontend/index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1a1a1a" />
    <meta name="description" content="Track your fitness journey" />
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
    <title>Fitness Friend</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# tests/setup.ts
cat > frontend/tests/setup.ts << 'EOF'
import '@testing-library/jest-dom'
EOF

# jest.config.js
cat > frontend/jest.config.js << 'EOF'
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  globals: {
    __API_BASE_URL__: 'http://localhost:5000/api'
  }
}
EOF

# eslint.config.js
cat > frontend/eslint.config.js << 'EOF'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
)
EOF

# .eslintrc.cjs
cat > frontend/.eslintrc.cjs << 'EOF'
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}
EOF

# README.md
cat > frontend/README.md << 'EOF'
# Fitness Friend Frontend

A React PWA for tracking fitness goals including weight, exercises, and nutrition.

## Tech Stack

- **Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS + daisyUI
- **State Management**: Zustand
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **PWA**: vite-plugin-pwa

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm run test
```

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## API Integration

The frontend connects to the Flask backend API. Ensure the backend is running at `http://localhost:5000` before starting the frontend.
EOF

echo ""
# Install dependencies
echo "📦 Installing dependencies..."
cd frontend
npm install

# Create .env file
echo "🔐 Creating .env file..."
cp .env.example .env

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "Start development server with:"
echo "  npm run dev"
echo ""
echo "The app will be available at: http://localhost:5173"
echo ""
