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
          bg: "#090d16",      // 玄青 (Deep Cyber slate)
          gold: "#fbbf24",    // 太古金 (Amber/Gold-400)
          cyan: "#22d3ee",    // 玄烛蓝 (Cyan-400)
          emerald: "#34d399", // 碧荧绿 (Emerald-400)
          gray: {
            950: "#0b0f19",
            900: "#111827",
            800: "#1f2937",
            400: "#9ca3af",
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
