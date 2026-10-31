/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1F3A5F",
          accent: "#E07A1F",
          dark: "#142640",
          light: "#EFF6FF"
        },
        ink: {
          DEFAULT: "#14181F",
          subtle: "#4A5565",
          muted: "#6B7280"
        },
        canvas: {
          DEFAULT: "#FAFAF7",
          surface: "#FFFFFF",
          line: "#E3E6EA"
        },
        verdict: {
          confirmed: { fg: "#0B7A3E", bg: "#E6F4EA", border: "#A3D9B5" },
          outdated: { fg: "#8A5A00", bg: "#FFF3D6", border: "#FAD88A" },
          altered: { fg: "#B45309", bg: "#FFEBD5", border: "#FBC396" },
          unverifiable: { fg: "#475569", bg: "#EEF2F6", border: "#CBD5E1" },
          forged: { fg: "#B3261E", bg: "#FDE7E5", border: "#F8A59F" },
        }
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans Devanagari"', "system-ui", "sans-serif"],
        serif: ['"Noto Serif"', '"Noto Serif Devanagari"', "Georgia", "serif"],
      }
    },
  },
  plugins: [],
}

