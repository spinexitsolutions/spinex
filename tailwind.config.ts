import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#120F1B", 2: "#1B1727", 3: "#262036" },
        mist: "#F5F3FA",
        line: "#E6E2EF",
        muted: "#625C74",
        lav: {
          100: "#EEEAFF",
          200: "#DCD4FF",
          300: "#C2B6FF",
          400: "#A595FB",
          500: "#8873EE",
          600: "#6E59D9",
          700: "#5745B5",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      letterSpacing: { tightest: "-0.045em" },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: { marquee: "marquee 38s linear infinite" },
    },
  },
  plugins: [],
};
export default config;
