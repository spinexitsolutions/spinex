import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ProjectsShowcase from "@/components/home/ProjectsShowcase";
import CTA from "@/components/home/CTA";

export const metadata: Metadata = {
  title: "Work",
  description: "Websites, stores, campaigns and videos made by Spinex IT Solutions.",
  openGraph: { title: "Work | Spinex IT Solutions", description: "Websites, stores, campaigns and videos made by Spinex IT Solutions.", url: "/work", type: "website", images: ["/og-image.jpg"] },
};

export default function WorkPage() {
  return (
    <>
      <PageHeader page="work" title="Projects we're proud of." intro="Websites, online stores, campaigns and films for businesses across India." />
      <ProjectsShowcase full />
      <CTA />
    </>
  );
}
