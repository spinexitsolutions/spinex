import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { AI_CRAWLERS, PRIVATE_PATHS } from "@/lib/seo";

// Public pages are open to search engines and AI assistants; private areas are closed to everyone.
export default function robots(): MetadataRoute.Robots {
  const allow = ["/", "/api/brand-icon", "/api/files/", "/api/img"];
  return {
    rules: [
      { userAgent: "*", allow, disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow, disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
