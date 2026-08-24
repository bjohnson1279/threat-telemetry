/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        threat: {
          bg: '#0a0e17',
          surface: '#111827',
          border: '#1f2937',
          low: '#22c55e',
          med: '#eab308',
          high: '#f97316',
          critical: '#ef4444',
          accent: '#3b82f6',
          text: '#e5e7eb',
          muted: '#9ca3af',
        }
      }
    },
  },
  plugins: [],
}
