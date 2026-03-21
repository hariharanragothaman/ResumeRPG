/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        rpg: {
          bg: "#0c0b12",
          surface: "#161422",
          border: "#2d2840",
          gold: "#e8c547",
          "gold-dim": "#9a7b2c",
          mana: "#6b8cff",
          hp: "#e24d4d",
          xp: "#47e8a8",
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', "ui-serif", "Georgia", "serif"],
        sans: ['"Outfit"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
