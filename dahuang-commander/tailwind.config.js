/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dahuang: {
          bg: "#14110d",      // 墨黑 (Warm ink)
          gold: "#b8844f",    // 秋香 (Gilt/Amber)
          cyan: "#5b7a8c",    // 花青 (Indigo-blue)
          emerald: "#3b5e59", // 石绿 (Jade-teal)
          gray: {
            950: "#14110d",
            900: "#1a1712",
            800: "#262019",
            400: "#8c7d68",
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'Courier New', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
}
