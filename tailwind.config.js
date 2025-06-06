/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // React bileşenlerinizin olduğu dizin
    "./public/index.html",       // public klasöründeki ana HTML dosyanız
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'], // Inter fontunu kullanmak için
      },
    },
  },
  plugins: [],
}