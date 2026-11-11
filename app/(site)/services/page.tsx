import type { Metadata } from "next";
import { PageJsonLd } from "@/components/JsonLd";
import { getContent } from "@/lib/content-server";
import { serviceSlug } from "@/lib/content";
import PageHeader from "@/components/PageHeader";
import ServicesDetail from "@/components/ServicesDetail";
import Industries from "@/components/home/Industries";
import CTA from "@/components/home/CTA";

export const metadata: Metadata = {
  title: "Our Services",
  description: "AI automation, SaaS software, websites, Shopify and WooCommerce stores, apps, SEO, Google and Meta ads, social media, video editing and graphic design from Jaipur, for all India.",
  alternates: { canonical: "/services" },
  openGraph: { title: "Our Services | Spinex IT Solutions", description: "AI automation, SaaS software, websites, Shopify and WooCommerce stores, apps, SEO, Google and Meta ads, social media, video editing and graphic design from Jaipur, for all India.", url: "/services", type: "website", images: ["/og-image.jpg"] },
};

export default async function ServicesPage() {
  const content = await getContent();
  const items = content.services.map((s) => ({ name: s.title, path: `/services/${serviceSlug(s)}`, description: s.short }));
  return (
    <>
      <PageJsonLd type="CollectionPage" name={"Services"} path="/services" description={"AI automation, SaaS software, websites, Shopify and WooCommerce stores, apps, SEO, Google and Meta ads, social media, video editing and graphic design from Jaipur, for all India."} items={items} />
      <PageHeader page="services" title="Everything your brand needs online." intro="Pick one service or let us handle the whole thing. Either way you get one team and one point of contact." />
      <ServicesDetail />
      <Industries />
      <CTA />
    </>
  );
}
