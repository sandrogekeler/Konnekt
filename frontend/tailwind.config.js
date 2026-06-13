/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
