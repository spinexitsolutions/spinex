// Fonts that can be picked in Admin → Fonts & text (see lib/typography.ts).
// next/font downloads them at build time and serves them from this site; each one only sets up a
// CSS variable (--ff-<id>), and the browser downloads a font file only when the page uses it.
import {
  Archivo, Bricolage_Grotesque, DM_Sans, DM_Serif_Display, Figtree, Fraunces, Inter, Lexend, Manrope, Montserrat, Nunito_Sans,
  Outfit, Playfair_Display, Plus_Jakarta_Sans, Poppins, Rubik, Sora, Space_Grotesk, Syne, Unbounded, Urbanist, Work_Sans,
} from "next/font/google";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", preload: true, variable: "--ff-bricolage" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: true, variable: "--ff-manrope" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-jakarta" });
const space = Space_Grotesk({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-space" });
const sora = Sora({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-sora" });
const outfit = Outfit({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-outfit" });
const syne = Syne({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-syne" });
const unbounded = Unbounded({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-unbounded" });
const poppins = Poppins({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-poppins", weight: ["400", "500", "600", "700", "800"] });
const montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-montserrat" });
const urbanist = Urbanist({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-urbanist" });
const lexend = Lexend({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-lexend" });
const archivo = Archivo({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-archivo" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-playfair" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-fraunces" });
const dmserif = DM_Serif_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-dmserif", weight: "400", style: ["normal", "italic"] });
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-inter" });
const dmsans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-dmsans" });
const figtree = Figtree({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-figtree" });
const worksans = Work_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-worksans" });
const rubik = Rubik({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-rubik" });
const nunito = Nunito_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--ff-nunito" });

// Class names for <html>, so every --ff-* variable exists on every page.
export const fontVars = [
  bricolage, manrope, jakarta, space, sora, outfit, syne, unbounded, poppins, montserrat, urbanist, lexend, archivo,
  playfair, fraunces, dmserif, inter, dmsans, figtree, worksans, rubik, nunito,
].map((f) => f.variable).join(" ");
