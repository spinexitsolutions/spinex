import { Great_Vibes, Lato, Playfair_Display } from "next/font/google";

// Fonts for printed letters and certificates. Lato has fixed weights (not a variable font),
// so letters keep their normal spacing in PDFs; the site's own font squeezed letters together when printed.
export const letterSans = Lato({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-letter", display: "swap" });
export const certSerif = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"], variable: "--font-cert-serif", display: "swap" });
export const certScript = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-cert-script", display: "swap" });

export const letterFontVars = `${letterSans.variable} ${certSerif.variable} ${certScript.variable}`;
export const LETTER_FONT = "var(--font-letter), 'Segoe UI', Arial, 'Noto Sans', sans-serif";
