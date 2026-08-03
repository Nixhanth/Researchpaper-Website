/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./auth/**/*.{ts,tsx}",
    "./admin/**/*.{ts,tsx}",
    "./shared/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        "background-light": "#f6f4ef",
        "background-dark": "#131118",
        primary: "#f6c343",
        "brand-blue": "#1f6feb"
      },
      fontFamily: {
        display: ["\"Plus Jakarta Sans\"", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
