/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'unt-primary': '#4B0082', // Indigo/purple
        'unt-accent': '#FF7F50', // Coral/orange
        'unt-secondary': '#8A2BE2', // Blue Violet
        'unt-light': '#F0E6FA', // Light purple background
        'unt-night': '#1A0033', // Dark purple
        'unt-white': '#FFFFFF',
        'unt-black': '#000000',
      },
    },
  },
  plugins: [],
}
