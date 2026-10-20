/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ["mongodb", "sharp"] },
  // Old service address → new one (E-commerce became E-commerce management).
  async redirects() {
    return [{ source: "/services/ecommerce-website-development", destination: "/services/ecommerce-management", permanent: true }];
  },
};
export default nextConfig;
