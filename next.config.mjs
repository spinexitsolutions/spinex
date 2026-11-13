/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ["mongodb", "sharp"] },
  // Old service address → new one (E-commerce became E-commerce management).
  async redirects() {
    return [
      { source: "/services/ecommerce-website-development", destination: "/services/ecommerce-management", permanent: true },
      // City pages live at /website-development-<city>; the inner address is never shown.
      { source: "/locations/:slug", destination: "/website-development-:slug", permanent: true },
    ];
  },
  // Basic security headers on every page and file. SAMEORIGIN still lets the admin show the site in its live preview.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
      ],
    }];
  },
  async rewrites() {
    return [{ source: "/website-development-:slug", destination: "/locations/:slug" }];
  },
};
export default nextConfig;
