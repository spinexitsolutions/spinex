import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy", description: "How Spinex IT Solutions collects, uses and protects personal data." };

export default function Page() {
  return <LegalPage slug="privacy" />;
}
