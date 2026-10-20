import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service", description: "Terms for using the Spinex IT Solutions website and services." };

export default function Page() {
  return <LegalPage slug="terms" />;
}
