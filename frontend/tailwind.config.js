/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'unt-blue': '#002B5B',
        'unt-yellow': '#FFD700',
        'unt-white': '#FFFFFF',
        'unt-black': '#000000',
        'night-blue': '#001F3F',
      },
    },
  },
  plugins: [],
}
