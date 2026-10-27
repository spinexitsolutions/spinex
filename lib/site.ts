// Public site address, used for canonical links, sitemap and structured data.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://spinexitsolutions.com").replace(/\/+$/, "");

// The address the person is using right now (behind nginx too), for links that must come back to the same site,
// like Google's sign-in return address. Falls back to SITE_URL.
export function requestOrigin(req: Request) {
  const h = req.headers;
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return SITE_URL;
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim() || (local ? "http" : "https");
  return `${proto === "http" ? "http" : "https"}://${host}`;
}
