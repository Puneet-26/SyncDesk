/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aicte: {
          navy: "#0a192f",
          dark: "#0f2942",
          primary: "#1e3a8a",
          light: "#f0f4f8",
          surface: "#ffffff",
          border: "#e2e8f0",
          saffron: "#ea580c",
          green: "#15803d"
        }
      }
    },
  },
  plugins: [],
}
