import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { ContentProvider } from "@/components/ContentProvider";
import { getContent } from "@/lib/content-server";
import { getSecret } from "@/lib/secrets";
import { themeCss } from "@/lib/theme";
import { SITE_URL } from "@/lib/site";
import "./globals.css";
import "./button-fx.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });

// Colour of the phone browser's address bar (Chrome on Android) and the app window.
export const viewport: Viewport = { themeColor: "#6e59d9" };

export async function generateMetadata(): Promise<Metadata> {
  const { brand, seo } = await getContent();
  // Owners can paste either the code or the whole <meta> tag from Google / Bing.
  const code = (v: unknown) => { const t = String(v ?? "").trim(); return (t.match(/content=["']([^"']+)["']/)?.[1] ?? t).replace(/[^A-Za-z0-9_\-]/g, "").slice(0, 120); };
  const google = code(seo?.googleVerification), bing = code(seo?.bingVerification);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: "Spinex IT Solutions | IT Company in Jaipur, Serving All India", template: "%s | Spinex IT Solutions" },
    description:
      "Spinex IT Solutions builds websites, online stores and on-demand apps, and runs SEO, ads, social media, video and brand promotion for businesses across India.",
    keywords: ["IT Company Jaipur", "Website Development Jaipur", "Website Development India", "App Development", "Digital Marketing Agency India", "Spinex IT Solutions"],
    openGraph: { title: "Spinex IT Solutions", description: "Websites, apps and digital marketing from Jaipur, for businesses across India.", type: "website", siteName: brand.name || "Spinex IT Solutions", locale: "en_IN", images: ["/og-image.jpg"] },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    ...(google || bing ? { verification: { ...(google ? { google } : {}), ...(bing ? { other: { "msvalidate.01": bing } } : {}) } } : {}),
    alternates: { types: { "text/plain": "/llms.txt" } },
    // Browser tab and phone home-screen icon: the company logo from Admin > Logo and company name
    icons: brand.logo
      ? {
          icon: [{ url: "/api/brand-icon?size=64&pad=12", type: "image/png", sizes: "64x64" }, { url: "/api/brand-icon?size=192&pad=12", type: "image/png", sizes: "192x192" }],
          apple: [{ url: "/api/brand-icon?size=180&pad=12", sizes: "180x180" }],
          shortcut: [{ url: "/api/brand-icon?size=64&pad=12" }],
        }
      : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [content, turnstileKey] = await Promise.all([getContent(), getSecret("TURNSTILE_SITE_KEY")]);
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <head>
        {/* Colour theme from Admin → Colour theme */}
        <style id="theme-vars" dangerouslySetInnerHTML={{ __html: themeCss(content.theme) }} />
      </head>
      <body>
        <ContentProvider initial={content} turnstileKey={turnstileKey}>{children}</ContentProvider>
      </body>
    </html>
  );
}
