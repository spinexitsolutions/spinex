// Fonts that can be picked in Admin → Fonts & text (see lib/typography.ts).
// next/font downloads them at build time and serves them from this site; each one only sets up a
// CSS variable (--ff-<id>), and the browser downloads a font file only when the page uses it.
import {
  Archivo, Bricolage_Grotesque, DM_Sans, DM_Serif_Display, Figtree, Fraunces, Inter, Lexend, Manrope, Montserrat, Nunito_Sans,
  Outfit, Playfair_Display, Plus_Jakarta_Sans, Poppins, Rubik, Sora, Space_Grotesk, Syne, Unbounded, Urbanist, Work_Sans,
} from "next/font/google";

const o = { subsets: ["latin"] as ["latin"], display: "swap" as const, preload: false };

const bricolage = Bricolage_Grotesque({ ...o, variable: "--ff-bricolage", preload: true });
const manrope = Manrope({ ...o, variable: "--ff-manrope", preload: true });
const jakarta = Plus_Jakarta_Sans({ ...o, variable: "--ff-jakarta" });
const space = Space_Grotesk({ ...o, variable: "--ff-space" });
const sora = Sora({ ...o, variable: "--ff-sora" });
const outfit = Outfit({ ...o, variable: "--ff-outfit" });
const syne = Syne({ ...o, variable: "--ff-syne" });
const unbounded = Unbounded({ ...o, variable: "--ff-unbounded" });
const poppins = Poppins({ ...o, variable: "--ff-poppins", weight: ["400", "500", "600", "700", "800"] });
const montserrat = Montserrat({ ...o, variable: "--ff-montserrat" });
const urbanist = Urbanist({ ...o, variable: "--ff-urbanist" });
const lexend = Lexend({ ...o, variable: "--ff-lexend" });
const archivo = Archivo({ ...o, variable: "--ff-archivo" });
const playfair = Playfair_Display({ ...o, variable: "--ff-playfair" });
const fraunces = Fraunces({ ...o, variable: "--ff-fraunces" });
const dmserif = DM_Serif_Display({ ...o, variable: "--ff-dmserif", weight: "400", style: ["normal", "italic"] });
const inter = Inter({ ...o, variable: "--ff-inter" });
const dmsans = DM_Sans({ ...o, variable: "--ff-dmsans" });
const figtree = Figtree({ ...o, variable: "--ff-figtree" });
const worksans = Work_Sans({ ...o, variable: "--ff-worksans" });
const rubik = Rubik({ ...o, variable: "--ff-rubik" });
const nunito = Nunito_Sans({ ...o, variable: "--ff-nunito" });

// Class names for <html>, so every --ff-* variable exists on every page.
export const fontVars = [
  bricolage, manrope, jakarta, space, sora, outfit, syne, unbounded, poppins, montserrat, urbanist, lexend, archivo,
  playfair, fraunces, dmserif, inter, dmsans, figtree, worksans, rubik, nunito,
].map((f) => f.variable).join(" ");
