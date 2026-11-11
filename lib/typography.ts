// Fonts and text animation, set in Admin → Site settings → Fonts & text.
// Every font is self-hosted by next/font (app/fonts.ts) as a CSS variable --ff-<id>;
// the browser downloads only the fonts the page actually uses.

export const FONTS = [
  { id: "bricolage", name: "Bricolage Grotesque", note: "Spinex default, friendly and bold", body: false },
  { id: "jakarta", name: "Plus Jakarta Sans", note: "Clean, modern", body: true },
  { id: "space", name: "Space Grotesk", note: "Techy, a little quirky", body: false },
  { id: "sora", name: "Sora", note: "Wide, geometric", body: true },
  { id: "outfit", name: "Outfit", note: "Round and simple", body: true },
  { id: "syne", name: "Syne", note: "Arty, wide letters", body: false },
  { id: "unbounded", name: "Unbounded", note: "Big and loud", body: false },
  { id: "poppins", name: "Poppins", note: "Popular, very readable", body: true },
  { id: "montserrat", name: "Montserrat", note: "Classic agency look", body: true },
  { id: "urbanist", name: "Urbanist", note: "Thin and elegant", body: true },
  { id: "lexend", name: "Lexend", note: "Easy to read", body: true },
  { id: "archivo", name: "Archivo", note: "Strong, newspaper-like", body: true },
  { id: "playfair", name: "Playfair Display", note: "Luxury serif", body: false },
  { id: "fraunces", name: "Fraunces", note: "Soft, old-style serif", body: false },
  { id: "dmserif", name: "DM Serif Display", note: "Fashion magazine serif", body: false },
  { id: "inter", name: "Inter", note: "Neutral, like apps", body: true },
  { id: "manrope", name: "Manrope", note: "Spinex default text font", body: true },
  { id: "dmsans", name: "DM Sans", note: "Soft and simple", body: true },
  { id: "figtree", name: "Figtree", note: "Warm and friendly", body: true },
  { id: "worksans", name: "Work Sans", note: "Plain and solid", body: true },
  { id: "rubik", name: "Rubik", note: "Slightly rounded corners", body: true },
  { id: "nunito", name: "Nunito Sans", note: "Light and airy", body: true },
] as const;
export type FontId = (typeof FONTS)[number]["id"];
const FONT_IDS = FONTS.map((f) => f.id) as readonly string[];

// How a heading appears. Used for the home hero headline and for section headings.
export const TEXT_ANIMS = [
  { id: "rise", name: "Rise from mask", note: "Words slide up from behind a line" },
  { id: "fade", name: "Soft fade", note: "Words fade in and float up a little" },
  { id: "blur", name: "Blur to sharp", note: "Words come into focus" },
  { id: "letters", name: "Letter by letter", note: "Each letter rises on its own" },
  { id: "typewriter", name: "Typewriter", note: "Typed out with a blinking cursor" },
  { id: "wave", name: "Bouncy drop", note: "Letters drop in with a small bounce" },
  { id: "slide", name: "Slide from left", note: "Words slide in from the side" },
  { id: "zoom", name: "Pop zoom", note: "Words grow into place" },
  { id: "flip", name: "3D flip", note: "Words flip up like cards" },
  { id: "scramble", name: "Scramble", note: "Random letters settle into words" },
  { id: "none", name: "No animation", note: "Text just shows" },
] as const;
export type TextAnim = (typeof TEXT_ANIMS)[number]["id"];

// Look of the highlighted words in the home hero headline (Admin → Hero → highlight words).
export const HIGHLIGHTS = [
  { id: "color", name: "Main colour", note: "Words in the brand colour" },
  { id: "gradient", name: "Colour gradient", note: "Moving colour blend" },
  { id: "brush", name: "Brush line", note: "Thick pen line underneath" },
  { id: "double", name: "Double line", note: "Two lines underneath" },
  { id: "marker", name: "Marker", note: "Highlighter behind the words" },
  { id: "circle", name: "Circled", note: "Pen circle around the words" },
  { id: "wave", name: "Wavy line", note: "Wavy line underneath" },
  { id: "zigzag", name: "Zigzag", note: "Zigzag line underneath" },
  { id: "dotted", name: "Dotted line", note: "Dots underneath" },
  { id: "loop", name: "Loop line", note: "Line with a little loop" },
  { id: "outline", name: "Outline", note: "Hollow letters" },
  { id: "serif", name: "Italic serif", note: "Fancy italic font, brand colour" },
  { id: "plain", name: "Same as text", note: "No highlight" },
] as const;
export type Highlight = (typeof HIGHLIGHTS)[number]["id"];

export const HEAD_WEIGHTS = ["500", "600", "700", "800"] as const;
export const HEAD_SPACINGS = ["tight", "normal", "loose"] as const;
export const SPEEDS = ["slow", "normal", "fast"] as const;

export type TypeSettings = {
  display: FontId; // headings
  body: FontId; // everything else
  headWeight: (typeof HEAD_WEIGHTS)[number];
  headSpacing: (typeof HEAD_SPACINGS)[number];
  heroAnim: TextAnim;
  headAnim: TextAnim; // section headings on every page
  highlight: Highlight;
  speed: (typeof SPEEDS)[number];
};

export const defaultType: TypeSettings = {
  display: "bricolage", body: "manrope", headWeight: "600", headSpacing: "tight",
  heroAnim: "rise", headAnim: "rise", highlight: "color", speed: "normal",
};

const pick = <T extends string>(list: readonly string[], v: unknown, d: T): T => (typeof v === "string" && list.includes(v) ? (v as T) : d);

// Saved settings with every field checked, so an old or broken save still works.
export function typeSettings(raw: Partial<TypeSettings> | undefined): TypeSettings {
  const v = raw ?? {};
  const anims = TEXT_ANIMS.map((a) => a.id) as readonly string[];
  return {
    display: pick(FONT_IDS, v.display, defaultType.display),
    body: pick(FONT_IDS, v.body, defaultType.body),
    headWeight: pick(HEAD_WEIGHTS, v.headWeight, defaultType.headWeight),
    headSpacing: pick(HEAD_SPACINGS, v.headSpacing, defaultType.headSpacing),
    heroAnim: pick(anims, v.heroAnim, defaultType.heroAnim),
    headAnim: pick(anims, v.headAnim, defaultType.headAnim),
    highlight: pick(HIGHLIGHTS.map((h) => h.id), v.highlight, defaultType.highlight),
    speed: pick(SPEEDS, v.speed, defaultType.speed),
  };
}

export const speedFactor = (s: TypeSettings["speed"]) => (s === "slow" ? 1.4 : s === "fast" ? 0.65 : 1);

// CSS for <style> in the page head. Only known ids and numbers reach the output, so it is safe to inline.
export function typeCss(raw: Partial<TypeSettings> | undefined, scope = ":root") {
  const t = typeSettings(raw);
  const spacing = t.headSpacing === "normal" ? "-0.02em" : t.headSpacing === "loose" ? "0em" : "-0.045em";
  let css = `${scope}{--font-display:var(--ff-${t.display});--font-body:var(--ff-${t.body})}`;
  if (t.headWeight !== "600" || t.headSpacing !== "tight") {
    const sel = [".h-display", ":is(h1,h2,h3).font-display"].map((s) => (scope === ":root" ? `:root ${s}` : `${scope} ${s}`)).join(",");
    css += `${sel}{font-weight:${t.headWeight};letter-spacing:${spacing}}`;
  }
  return css;
}
