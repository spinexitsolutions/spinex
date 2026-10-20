import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { ContentProvider } from "@/components/ContentProvider";
import { getContent } from "@/lib/content-server";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getContent();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: "Spinex IT Solutions | IT Company in Jaipur, Serving All India", template: "%s | Spinex IT Solutions" },
    description:
      "Spinex IT Solutions builds websites, online stores and on-demand apps, and runs SEO, ads, social media, video and brand promotion for businesses across India.",
    keywords: ["IT Company Jaipur", "Website Development Jaipur", "Website Development India", "App Development", "Digital Marketing Agency India", "Spinex IT Solutions"],
    openGraph: { title: "Spinex IT Solutions", description: "Websites, apps and digital marketing from Jaipur, for businesses across India.", type: "website" },
    // Browser tab and phone home-screen icon: the company logo from Admin > Brand and hero
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
  const content = await getContent();
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body>
        <ContentProvider initial={content}>{children}</ContentProvider>
      </body>
    </html>
  );
}
