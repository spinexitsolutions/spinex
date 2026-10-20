import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Spinex IT Solutions collects, uses and protects personal data.",
  openGraph: { title: "Privacy Policy | Spinex IT Solutions", description: "How Spinex IT Solutions collects, uses and protects personal data.", url: "/privacy", type: "website", images: ["/og-image.jpg"] },
};

export default function Page() {
  return <LegalPage slug="privacy" />;
}
