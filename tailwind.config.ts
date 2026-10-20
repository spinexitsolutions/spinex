import type { Config } from "tailwindcss";

const c = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Colours come from CSS variables so Admin → Colour theme can change them (see lib/theme.ts).
        ink: { DEFAULT: c("ink"), 2: c("ink-2"), 3: c("ink-3") },
        mist: c("mist"),
        line: c("line"),
        muted: c("muted"),
        lav: { 100: c("lav-100"), 200: c("lav-200"), 300: c("lav-300"), 400: c("lav-400"), 500: c("lav-500"), 600: c("lav-600"), 700: c("lav-700") },
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
