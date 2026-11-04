import type { Metadata, Viewport } from "next";

// The admin has its own home-screen app (name, icon, opens at /admin).
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
  manifest: "/admin-app.webmanifest",
  appleWebApp: { capable: true, title: "Spinex Admin", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#120f1b" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
