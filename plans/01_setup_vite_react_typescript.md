# Plan: Setup Vite + React + TypeScript Project

## Overview
Initialize the React PWA frontend project with Vite, TypeScript, and essential configuration.

## Tasks

### 1. Create Vite Project
- Run `npm create vite@latest frontend -- --template react-ts`
- Navigate to `frontend` directory

### 2. Install Core Dependencies
```bash
npm install axios@1.14.0 react-router-dom@6.x zustand@4.x recharts@2.x date-fns@3.x
```

### 3. Install UI Dependencies
```bash
npm install tailwindcss@3.x postcss@8.x autoprefixer@10.x @headlessui/react@1.x
npm install daisyui@4.x
```

### 4. Install Form Dependencies
```bash
npm install react-hook-form@7.x zod@3.x @hookform/resolvers@3.x
```

### 5. Install PWA Dependencies
```bash
npm install -D vite-plugin-pwa@0.17.x
```

### 6. Install Testing Dependencies
```bash
npm install -D jest@29.x @types/jest@29.x @testing-library/react@14.x @testing-library/jest-dom@6.x ts-jest@29.x
```

### 7. Install Linting Dependencies
```bash
npm install -D eslint@8.x @typescript-eslint/eslint-plugin@6.x @typescript-eslint/parser@6.x
```

### 8. Initialize Tailwind CSS
```bash
npx tailwindcss init -p
```

### 9. Create Project Structure
Create directories:
- `src/api/`
- `src/components/common/`
- `src/components/layout/`
- `src/components/charts/`
- `src/hooks/`
- `src/pages/Auth/`
- `src/pages/Weight/`
- `src/pages/Exercise/`
- `src/pages/Food/`
- `src/pages/Meals/`
- `src/store/`
- `src/types/`
- `src/utils/`
- `public/icons/`
- `tests/`
- `tests/api/`
- `tests/components/`
- `tests/pages/`

### 10. Create Configuration Files
- `vite.config.ts` - Vite configuration with PWA plugin
- `tailwind.config.js` - Tailwind + daisyUI configuration
- `postcss.config.js` - PostCSS configuration
- `tsconfig.json` - TypeScript configuration with path aliases
- `eslint.config.js` - ESLint configuration
- `.eslintrc.cjs` - Additional ESLint rules
- `.gitignore` - Git ignore patterns for frontend

### 11. Create Entry Files
- `index.html` - HTML entry point
- `src/main.tsx` - React entry point
- `src/App.tsx` - Main App component with routing
- `src/index.css` - Tailwind directives

## Expected Outcome
- Vite project initialized with React TypeScript template
- All dependencies installed
- Project structure created
- Configuration files in place
- Ready for component development

## Notes
- Ensure Node.js version 18+ is installed
- Use npm for package management
- Keep package.json updated with all dependencies