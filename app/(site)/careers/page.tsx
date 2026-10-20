import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import CareersContent from "@/components/CareersContent";

export const metadata: Metadata = {
  title: "Careers",
  description: "Jobs at Spinex IT Solutions, Jaipur: web developers, designers, video editors and digital marketers.",
  alternates: { canonical: "/careers" },
  openGraph: { title: "Careers | Spinex IT Solutions", description: "Jobs at Spinex IT Solutions, Jaipur: web developers, designers, video editors and digital marketers.", url: "/careers", type: "website", images: ["/og-image.jpg"] },
};

export default function CareersPage() {
  return (
    <>
      <PageHeader page="careers" title="Build great work with us." intro="See the open roles below." />
      <CareersContent />
    </>
  );
}
