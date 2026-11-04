import type { Metadata } from "next";
import { PageJsonLd } from "@/components/JsonLd";
import PageHeader from "@/components/PageHeader";
import AboutIntro from "@/components/AboutIntro";
import Founders from "@/components/Founders";
import Stats from "@/components/home/Stats";
import Process from "@/components/home/Process";
import CTA from "@/components/home/CTA";

export const metadata: Metadata = {
  title: "About Us",
  description: "Spinex IT Solutions is a Jaipur IT company that designs websites, builds online stores and apps, and runs SEO, ads, social media and video for businesses across India.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About Us | Spinex IT Solutions", description: "Spinex IT Solutions is a Jaipur IT company that designs websites, builds online stores and apps, and runs SEO, ads, social media and video for businesses across India.", url: "/about", type: "website", images: ["/og-image.jpg"] },
};

export default function AboutPage() {
  return (
    <>
      <PageJsonLd type="AboutPage" name={"About Spinex IT Solutions"} path="/about" description={"Spinex IT Solutions is a Jaipur IT company that designs websites, builds online stores and apps, and runs SEO, ads, social media and video for businesses across India."} />
      <PageHeader page="about" title="A Jaipur studio that builds for results." intro="Design, development, marketing and video under one roof, so your brand looks and works the same everywhere." />
      <AboutIntro />
      <Founders />
      <Stats />
      <Process />
      <CTA />
    </>
  );
}
