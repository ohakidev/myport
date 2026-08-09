/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#05070f",
        panel: "#0b101d",
        ink: "#e8edf5",
        dim: "#8b96a8",
        ghblue: "#58a6ff",
        ghgreen: "#3fb950",
        ghgold: "#d29922",
        ghred: "#f85149"
      }
    }
  },
  plugins: []
};
