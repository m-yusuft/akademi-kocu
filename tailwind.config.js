/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [], // Tailwind'in kendi eklentileri (varsa) buraya gelir, PostCSS eklentileri değil!
};