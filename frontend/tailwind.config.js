/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          500: '#3b82f6', // primary blue
          600: '#2563eb',
          700: '#1d4ed8',
        },
        dark: {
          900: '#030712', // deep background
          800: '#111827', // panel background
          700: '#1f2937', // cards / borders
          600: '#374151',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-inner': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
