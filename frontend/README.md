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

## Project Structure

```
frontend/
├── public/
│   └── icons/          # PWA icons
├── src/
│   ├── api/            # API client and services
│   ├── components/     # Reusable components
│   │   ├── common/     # Common UI components
│   │   ├── layout/     # Layout components
│   │   └── charts/     # Chart components
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   │   ├── Auth/       # Authentication pages
│   │   ├── Weight/     # Weight tracking pages
│   │   ├── Exercise/   # Exercise tracking pages
│   │   ├── Food/       # Food tracking pages
│   │   └── Meals/      # Meal photo pages
│   ├── store/          # Zustand stores
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main App component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── tests/              # Test files
├── index.html          # HTML entry point
├── package.json
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
├── tsconfig.json       # TypeScript configuration
└── jest.config.js      # Jest configuration
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## API Integration

The frontend connects to the Flask backend API. Ensure the backend is running at `http://localhost:5000` before starting the frontend.

## PWA Features

- Offline support
- Add to home screen
- Push notifications (ready for implementation)

## License

MIT
