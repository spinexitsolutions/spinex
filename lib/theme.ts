// Colour theme set in Admin → Colour theme. The whole site (and the admin panel) uses CSS variables
// (--c-ink, --c-lav-100 … --c-lav-700, --c-mist, --c-line, --c-muted), so changing them recolours everything.

export type ThemeSettings = { preset: string; accent: string; dark: string };

type Palette = Record<"ink" | "ink-2" | "ink-3" | "mist" | "line" | "muted" | "lav-100" | "lav-200" | "lav-300" | "lav-400" | "lav-500" | "lav-600" | "lav-700", string>;

export const THEME_PRESETS: { id: string; name: string; accent: string; dark: string }[] = [
  { id: "lavender", name: "Lavender (Spinex)", accent: "#6E59D9", dark: "#120F1B" },
  { id: "ocean", name: "Ocean blue", accent: "#2563EB", dark: "#0B1220" },
  { id: "emerald", name: "Emerald", accent: "#059669", dark: "#0B1512" },
  { id: "sunset", name: "Sunset orange", accent: "#EA580C", dark: "#1A110B" },
  { id: "rose", name: "Rose", accent: "#E11D48", dark: "#1A0E12" },
  { id: "teal", name: "Teal", accent: "#0D9488", dark: "#0A1716" },
  { id: "gold", name: "Royal gold", accent: "#B7791F", dark: "#16120A" },
  { id: "graphite", name: "Graphite", accent: "#475569", dark: "#0F1115" },
];

export const DEFAULT_THEME: ThemeSettings = { preset: "lavender", accent: "#6E59D9", dark: "#120F1B" };

// The original hand-tuned lavender palette, so the default looks exactly as designed.
const LAVENDER: Palette = {
  ink: "#120F1B", "ink-2": "#1B1727", "ink-3": "#262036", mist: "#F5F3FA", line: "#E6E2EF", muted: "#625C74",
  "lav-100": "#EEEAFF", "lav-200": "#DCD4FF", "lav-300": "#C2B6FF", "lav-400": "#A595FB", "lav-500": "#8873EE", "lav-600": "#6E59D9", "lav-700": "#5745B5",
};

export const validHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

const toRgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (rgb: number[]) => "#" + rgb.map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0")).join("").toUpperCase();
// amount 0 → a, 1 → b
const mix = (a: string, b: string, amount: number) => {
  const x = toRgb(a), y = toRgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * amount));
};

export function buildPalette(t: Partial<ThemeSettings> | undefined): Palette {
  const accent = t?.accent && validHex(t.accent) ? t.accent.toUpperCase() : DEFAULT_THEME.accent;
  const dark = t?.dark && validHex(t.dark) ? t.dark.toUpperCase() : DEFAULT_THEME.dark;
  if (accent === DEFAULT_THEME.accent && dark === DEFAULT_THEME.dark) return LAVENDER;
  return {
    ink: dark,
    "ink-2": mix(dark, "#FFFFFF", 0.05),
    "ink-3": mix(dark, "#FFFFFF", 0.11),
    mist: mix(accent, "#FFFFFF", 0.955),
    line: mix(mix(accent, dark, 0.35), "#FFFFFF", 0.88),
    muted: mix(dark, "#FFFFFF", 0.38),
    "lav-100": mix(accent, "#FFFFFF", 0.9),
    "lav-200": mix(accent, "#FFFFFF", 0.78),
    "lav-300": mix(accent, "#FFFFFF", 0.6),
    "lav-400": mix(accent, "#FFFFFF", 0.38),
    "lav-500": mix(accent, "#FFFFFF", 0.18),
    "lav-600": accent,
    "lav-700": mix(accent, "#000000", 0.2),
  };
}

// CSS for <style> in the page head. Only hex digits reach the output, so it is safe to inline.
export function themeCss(t: Partial<ThemeSettings> | undefined) {
  const p = buildPalette(t);
  const vars = Object.entries(p).map(([k, hex]) => `--c-${k}:${toRgb(hex).join(" ")}`).join(";");
  return `:root{${vars}}`;
}
