import { Fragment } from "react";
import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import Marquee from "@/components/home/Marquee";
import TrustedBy from "@/components/home/TrustedBy";
import ServicesList from "@/components/home/ServicesList";
import WhySpinex from "@/components/home/WhySpinex";
import Process from "@/components/home/Process";
import ProjectsShowcase from "@/components/home/ProjectsShowcase";
import Showreel from "@/components/home/Showreel";
import Industries from "@/components/home/Industries";
import Goals from "@/components/home/Goals";
import Testimonials from "@/components/home/Testimonials";
import Planner from "@/components/home/Planner";
import SeoText from "@/components/home/SeoText";
import Faq from "@/components/home/Faq";
import QuickContact from "@/components/home/QuickContact";
import JsonLd from "@/components/JsonLd";
import LatestPosts from "@/components/home/LatestPosts";
import { getPublishedPosts } from "@/lib/post-db";
import { getContent } from "@/lib/content-server";
import { homeOrder } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { seo, brand } = await getContent();
  return {
    title: { absolute: seo.metaTitle },
    description: seo.metaDescription,
    keywords: seo.keywords,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: brand.name,
      title: seo.metaTitle,
      description: seo.metaDescription,
      locale: "en_IN",
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: brand.name }],
    },
    twitter: { card: "summary_large_image", title: seo.metaTitle, description: seo.metaDescription, images: ["/og-image.jpg"] },
  };
}

export default async function HomePage() {
  const [content, posts] = await Promise.all([getContent(), getPublishedPosts()]);

  const blocks: Record<string, React.ReactNode> = {
    trusted: <TrustedBy />,
    marquee: <Marquee />,
    services: <ServicesList />,
    why: <WhySpinex />,
    process: <Process />,
    work: <ProjectsShowcase />,
    showreel: <Showreel />,
    industries: <Industries />,
    goals: <Goals />,
    testimonials: <Testimonials />,
    planner: <Planner />,
    blog: <LatestPosts posts={posts} content={content} />,
    seo: <SeoText content={content} />,
    faq: <Faq />,
    contact: <QuickContact />,
  };

  // Order and visibility come from Admin > Home page. Sections added later are filled in by homeOrder.
  const order = homeOrder(content.homeLayout).filter((b) => b.id in blocks);
  const faqShown = order.some((b) => b.id === "faq" && b.visible);

  return (
    <>
      <JsonLd content={content} faq={faqShown} />
      <Hero />
      {order.filter((b) => b.visible).map((b) => (
        <Fragment key={b.id}>{blocks[b.id]}</Fragment>
      ))}
    </>
  );
}
