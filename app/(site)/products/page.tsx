import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import CTA from "@/components/home/CTA";
import { getContent } from "@/lib/content-server";
import { productSlug } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { pages, brand } = await getContent();
  return {
    title: "Products",
    description: pages.products?.intro || `Software and SaaS products built by ${brand.name}.`,
    alternates: { canonical: "/products" },
  };
}

export default async function ProductsPage() {
  const content = await getContent();
  const products = content.products;

  return (
    <>
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
            <ul className="grid gap-6 md:grid-cols-2">
              {products.map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${productSlug(p)}`} className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-line bg-white transition duration-300 hover:-translate-y-1 hover:border-ink hover:shadow-[0_24px_50px_-30px_rgba(20,16,40,0.4)]">
                    <div className="relative aspect-[16/10] overflow-hidden bg-mist">
                      {p.image ? (
                        <img src={p.image} alt={`${p.name} screenshot`} loading="lazy" className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.03]" />
                      ) : (
                        <div className="grid h-full place-items-center text-lav-300"><Package size={48} /></div>
                      )}
                      {p.status && <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink shadow-sm">{p.status}</span>}
                    </div>
                    <div className="flex flex-1 flex-col p-7">
                      {p.category && <p className="text-sm font-medium text-lav-700">{p.category}</p>}
                      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{p.name}</h2>
                      <p className="mt-2 text-muted">{p.tagline || p.description}</p>
                      {p.features.length > 0 && (
                        <ul className="mt-5 flex flex-wrap gap-2">
                          {p.features.slice(0, 4).map((f) => <li key={f} className="rounded-full bg-mist px-3 py-1 text-xs text-ink/80">{f}</li>)}
                        </ul>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-4 pt-7">
                        <span className="text-sm font-semibold">{p.price || "Price on request"}</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold group-hover:text-lav-700">View product <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <CTA />
    </>
  );
}
