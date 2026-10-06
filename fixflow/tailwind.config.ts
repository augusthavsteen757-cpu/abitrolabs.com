import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f7f6f2",
        ink: { DEFAULT: "#14201c", soft: "#3d4a45", muted: "#6b7772" },
        line: "#e4e2da",
        brand: {
          50: "#eef7f2",
          100: "#d6ece1",
          200: "#b0d9c6",
          300: "#7cc0a5",
          400: "#4ea283",
          500: "#2f8468",
          600: "#226b55",
          700: "#1c5746",
          800: "#18473a",
          900: "#143a31",
          950: "#0b221c",
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Fraunces Variable"', "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,32,28,0.04), 0 4px 16px -4px rgba(20,32,28,0.08)",
        lift: "0 2px 4px rgba(20,32,28,0.05), 0 16px 40px -12px rgba(20,32,28,0.22)",
      },
      keyframes: {
        scan: { "0%": { top: "0%" }, "50%": { top: "calc(100% - 4px)" }, "100%": { top: "0%" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: {
        scan: "scan 2.4s ease-in-out infinite",
        "fade-up": "fade-up .4s ease-out both",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
