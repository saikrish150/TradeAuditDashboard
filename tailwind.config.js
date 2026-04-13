/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'journal': {
          'bg': '#0A0A0A',
          'secondary': '#141414',
          'card': '#1C1C1C',
          'red': '#E63946',
          'green': '#2ECC71',
          'gold': '#D4AF37',
          'text-primary': '#FFFFFF',
          'text-secondary': '#B8B8B8',
          'text-muted': '#6B6B6B',
        }
      }
    },
  },
  plugins: [
    tailwindcssAnimate
  ],
}
