/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Azul marino corporativo (texto "Acerca")
        navy: {
          50:  "#E9EBEF",
          100: "#C7CCD6",
          200: "#9AA1B0",
          300: "#6E7787",
          400: "#454D5F",
          500: "#283040",
          600: "#1F2535",
          700: "#171C28",
          800: "#10131C",
          900: "#080A10",
        },
        // Naranja vivo corporativo (puzzle del logo) — CTA / acento
        orange: {
          50:  "#FFF1E0",
          100: "#FFDBB0",
          200: "#FFC080",
          300: "#FFA34D",
          400: "#FF8E20",
          500: "#F88000",
          600: "#D86E00",
          700: "#B25A00",
          800: "#834300",
          900: "#552B00",
        },
        // Azul brillante corporativo (decorativo)
        sky: {
          50:  "#E0F4FF",
          100: "#B3E2FF",
          200: "#80CFFF",
          300: "#4DBCFF",
          400: "#1FAAFF",
          500: "#0098F8",
          600: "#0080D0",
          700: "#0066A8",
          800: "#004D80",
          900: "#003355",
        },
        // Aliases semánticos
        brand: {
          50:  "#E9EBEF",
          500: "#283040",
          600: "#1F2535",
          700: "#171C28",
        },
        accent: {
          50:  "#FFF1E0",
          500: "#F88000",
          600: "#D86E00",
          700: "#B25A00",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
