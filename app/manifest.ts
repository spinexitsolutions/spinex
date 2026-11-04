import type { MetadataRoute } from "next";
import { getContent } from "@/lib/content-server";

// "Add to Home screen" on phones: the site opens like an app with the Spinex icon and colours.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const content = await getContent().catch(() => null);
  const name = content?.brand.name || "Spinex IT Solutions";
  return {
    name,
    short_name: "Spinex",
    description: content?.seo.metaDescription || "Websites, online stores, apps and digital marketing from Jaipur, for all of India.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6e59d9",
    icons: [
      { src: "/api/brand-icon?size=192&pad=12", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/brand-icon?size=512&pad=12", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/api/brand-icon?size=512&pad=22", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
