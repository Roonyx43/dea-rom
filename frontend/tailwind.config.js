/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,vue}", // Inclua seus arquivos .vue
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('tailwind-scrollbar'),
    // Você pode adicionar outros plugins aqui
  ],
}
