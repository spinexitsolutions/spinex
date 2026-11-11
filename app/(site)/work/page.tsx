import type { Metadata } from "next";
import { PageJsonLd } from "@/components/JsonLd";
import { getContent } from "@/lib/content-server";
import { projectSlug } from "@/lib/content";
import PageHeader from "@/components/PageHeader";
import { WorkProjects } from "@/components/home/HomeWork";
import CTA from "@/components/home/CTA";

export const metadata: Metadata = {
  title: "Our Work",
  description: "Websites, online stores, apps, ad campaigns and videos made by Spinex IT Solutions for businesses in Jaipur and across India. See the projects and results.",
  alternates: { canonical: "/work" },
  openGraph: { title: "Our Work | Spinex IT Solutions", description: "Websites, online stores, apps, ad campaigns and videos made by Spinex IT Solutions for businesses in Jaipur and across India. See the projects and results.", url: "/work", type: "website", images: ["/og-image.jpg"] },
};

export default async function WorkPage() {
  const content = await getContent();
  const items = content.projects.filter((p) => !p.hidePage).map((p) => ({ name: p.title, path: `/work/${projectSlug(p)}`, description: p.category }));
  return (
    <>
      <PageJsonLd type="CollectionPage" name={"Our work"} path="/work" description={"Websites, online stores, apps, ad campaigns and videos made by Spinex IT Solutions for businesses in Jaipur and across India. See the projects and results."} items={items} />
      <PageHeader page="work" title="Projects we're proud of." intro="Websites, online stores, campaigns and films for businesses across India." />
      <WorkProjects />
      <CTA />
    </>
  );
}
