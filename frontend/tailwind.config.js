/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mfp: {
          blue: '#185ADB',
          bg: '#f2f2f2',
          text: '#212121',
          textSecondary: '#757575',
          border: '#e0e0e0',
          success: '#4CAF50',
          error: '#E53935',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
