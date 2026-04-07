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
          'red': '#FF3B3B',
          'gold': '#D4AF37',
          'bg': '#0B0B0B',
          'card': '#121212',
        }
      }
    },
  },
  plugins: [
    tailwindcssAnimate
  ],
}
