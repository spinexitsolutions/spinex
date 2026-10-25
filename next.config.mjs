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
  async rewrites() {
    return [{ source: "/website-development-:slug", destination: "/locations/:slug" }];
  },
};
export default nextConfig;
