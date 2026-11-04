// "Add to Home screen" for the admin panel: opens straight into /admin like an app, with its own name.
export const dynamic = "force-static";

export function GET() {
  return new Response(
    JSON.stringify({
      name: "Spinex Admin",
      short_name: "Spinex Admin",
      description: "Leads, clients, invoices and the website editor.",
      id: "/admin",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#120f1b",
      theme_color: "#120f1b",
      icons: [
        { src: "/api/brand-icon?size=192&pad=12", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/api/brand-icon?size=512&pad=12", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/api/brand-icon?size=512&pad=22", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "Leads", url: "/admin#leads" },
        { name: "Quotes and invoices", url: "/admin#billing" },
        { name: "Clients", url: "/admin#clients" },
      ],
    }),
    { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } },
  );
}
