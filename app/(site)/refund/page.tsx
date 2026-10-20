import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Refund & Cancellation Policy", description: "How cancellations and refunds work for Spinex IT Solutions services." };

export default function Page() {
  return <LegalPage slug="refund" />;
}
