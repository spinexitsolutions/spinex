import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using the Spinex IT Solutions website and services.",
  openGraph: { title: "Terms of Service | Spinex IT Solutions", description: "Terms for using the Spinex IT Solutions website and services.", url: "/terms", type: "website", images: ["/og-image.jpg"] },
};

export default function Page() {
  return <LegalPage slug="terms" />;
}
