import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        command: {
          950: "#02050c",
          900: "#06101e",
          800: "#0a1a2d",
          700: "#0f2942"
        },
        signal: {
          cyan: "#22d3ee",
          violet: "#8b5cf6",
          red: "#fb3d55",
          amber: "#f59e0b",
          green: "#34d399"
        }
      },
      boxShadow: {
        glow: "0 0 28px rgba(34, 211, 238, 0.18)",
        "glow-lg": "0 0 48px rgba(34, 211, 238, 0.25)",
        alert: "0 0 34px rgba(251, 61, 85, 0.24)",
        quantum: "0 0 34px rgba(139, 92, 246, 0.22)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "count-up": "count-up 1.2s ease-out"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
