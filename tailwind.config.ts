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
        ink: "#1f2933",
        line: "#d8dee7",
        surface: "#f7f9fb",
        edp: "#cf2030"
      }
    }
  },
  plugins: []
};

export default config;
