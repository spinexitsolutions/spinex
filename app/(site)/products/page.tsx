import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import CTA from "@/components/home/CTA";
import { getContent } from "@/lib/content-server";
import ProductsGrid from "@/components/ProductsGrid";
import { PageJsonLd } from "@/components/JsonLd";
import { productSlug } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { pages, brand } = await getContent();
  const description = pages.products?.intro || `Software and SaaS products built by ${brand.name}.`;
  return {
    title: "Products",
    description,
    alternates: { canonical: "/products" },
    openGraph: { title: "Products | Spinex IT Solutions", description, url: "/products", type: "website", images: ["/og-image.jpg"] },
  };
}

export default async function ProductsPage() {
  const content = await getContent();
  const products = content.products;

  return (
    <>
      <PageJsonLd type="CollectionPage" name="Products" path="/products" description={content.pages.products?.intro} items={products.filter((p) => p.name).map((p) => ({ name: p.name, path: `/products/${productSlug(p)}`, description: p.tagline || p.description }))} />
      <PageHeader page="products" title="Software we built and run." intro="Ready-made tools and SaaS products from the Spinex team. Ask for a free demo of any of them." />

      <section className="bg-white py-20 sm:py-28">
        <div className="container-x">
          {products.length === 0 ? (
            <div className="mx-auto max-w-xl text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lav-100 text-lav-700"><Package size={24} /></span>
              <h2 className="h-display mt-6 text-3xl sm:text-4xl">Our products are on their way.</h2>
              <p className="mt-4 text-lg text-muted">We are adding our software here. Want to know what we have ready? Ask us for a demo.</p>
              <Link href="/contact" className="btn-dark mt-8 inline-flex">Ask for a demo <ArrowUpRight size={17} /></Link>
            </div>
          ) : (
            <ProductsGrid products={products} whatsapp={content.contact.whatsapp} />
          )}
        </div>
      </section>

      <CTA />
    </>
  );
}
