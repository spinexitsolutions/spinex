import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ServicesDetail from "@/components/ServicesDetail";
import ServiceNav from "@/components/ServiceNav";
import Industries from "@/components/home/Industries";
import CTA from "@/components/home/CTA";

export const metadata: Metadata = { title: "Services", description: "Web development, e-commerce, digital marketing, social media, video editing and graphic design in Jaipur." };

export default function ServicesPage() {
  return (
    <>
      <PageHeader page="services" title="Everything your brand needs online." intro="Pick one service or let us handle the whole thing. Either way you get one team and one point of contact." />
      <ServiceNav />
      <ServicesDetail />
      <Industries />
      <CTA />
    </>
  );
}
