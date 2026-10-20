import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import AboutIntro from "@/components/AboutIntro";
import Stats from "@/components/home/Stats";
import Process from "@/components/home/Process";
import CTA from "@/components/home/CTA";

export const metadata: Metadata = {
  title: "About",
  description: "Spinex IT Solutions is a Jaipur studio for websites, e-commerce, marketing and content.",
  openGraph: { title: "About | Spinex IT Solutions", description: "Spinex IT Solutions is a Jaipur studio for websites, e-commerce, marketing and content.", url: "/about", type: "website", images: ["/og-image.jpg"] },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader page="about" title="A Jaipur studio that builds for results." intro="Design, development, marketing and video under one roof, so your brand looks and works the same everywhere." />
      <AboutIntro />
      <Stats />
      <Process />
      <CTA />
    </>
  );
}
