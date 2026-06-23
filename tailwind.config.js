/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        accent: '#ef4444',
        success: '#22c55e',
        card: '#111111',
        border: '#1a1a1a',
        bg: '#0a0a0a',
        primary: '#f5f5f5',
        muted: '#737373',
      },
    },
  },
  plugins: [],
}
