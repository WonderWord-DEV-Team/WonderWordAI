import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        coral: "rgb(var(--color-coral) / <alpha-value>)",
        teal: "rgb(var(--color-teal) / <alpha-value>)",
        navy: "rgb(var(--color-navy) / <alpha-value>)"
      },
      fontFamily: {
        body: ["var(--font-body)"],
        display: ["var(--font-display)"]
      },
      boxShadow: {
        soft: "0 18px 55px rgb(31 45 61 / 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
