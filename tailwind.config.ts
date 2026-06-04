import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#FFFFFF",
        line: "rgba(255,255,255,0.08)",
        surface: "#24354F",
        card: "#263A57",
        edp: "#00E676",
        "edp-hover": "#00C853",
        "edp-navy": "#1E2D44",
        "edp-muted": "#C7D0DA"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
