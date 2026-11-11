import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import ProductsGrid from "@/components/ProductsGrid";
import { SplitHeading } from "@/components/Reveal";

// Home page "Our products": the same cards as the Products page (one big card, the rest in pairs), up to five products.
// Which is big, small or hidden is set per product in Admin → Products ("On the home page").
// The whole section is switched on or off in Admin → Home page.
export default function HomeProducts({ content }: { content: SiteContent }) {
  const shown = content.products.filter((p) => p.name && p.home !== "hide").slice(0, 5);
  if (!shown.length) return null;
  const sec = content.sections.products;
  const wa = content.contact.whatsapp;

  return (
    <section className="bg-white py-20 sm:py-28" data-home-products>
      <div className="container-x">
        <div className="mb-8 flex flex-col justify-between gap-6 sm:mb-10 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.16em] text-lav-600 sm:text-[13px]">Our products</p>
            <SplitHeading text={sec?.heading || "Software we built."} className="h-display text-4xl sm:text-6xl" />
            {sec?.intro && <p className="mt-4 max-w-xl text-muted sm:text-lg">{sec.intro}</p>}
          </div>
          <Link href="/products" className="btn-ghost w-fit shrink-0">All products <ArrowUpRight size={16} /></Link>
        </div>

        <ProductsGrid products={shown} whatsapp={wa} home />
      </div>
    </section>
  );
}
