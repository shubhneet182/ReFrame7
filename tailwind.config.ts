import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        blue: {
          DEFAULT: "var(--blue)",
          pale: "var(--blue-pale)",
          dark: "var(--blue-dark)",
        },
        lavender: {
          DEFAULT: "var(--lavender)",
          pale: "var(--lavender-pale)",
          dark: "var(--lavender-dark)",
        },
        sage: {
          DEFAULT: "var(--sage)",
          pale: "var(--sage-pale)",
          dark: "var(--sage-dark)",
        },
        blush: {
          DEFAULT: "var(--blush)",
          pale: "var(--blush-pale)",
        },
        cream: "var(--cream)",
        "warm-dark": "var(--warm-dark)",
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        border: "var(--border)",
        border2: "var(--border2)",
        text: "var(--text)",
        text2: "var(--text2)",
        text3: "var(--text3)",
        text4: "var(--text4)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
