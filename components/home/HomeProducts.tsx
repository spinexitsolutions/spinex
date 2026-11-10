import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { productBuyLink, productSlug, type SiteContent } from "@/lib/content";
import { sized } from "@/lib/img";

// Home page "Our products": up to three of our own software products, with price and Buy now.
// On/off and order in Admin → Home page; a product can be kept off here in Admin → Products.
export default function HomeProducts({ content }: { content: SiteContent }) {
  const list = content.products.filter((p) => p.name && p.home !== "hide").slice(0, 3);
  if (!list.length) return null;
  const sec = content.sections.products;
  return (
    <section className="bg-white py-24 sm:py-28" data-home-products>
      <div className="container-x">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="h-display text-4xl sm:text-6xl">{sec?.heading || "Software we built."}</h2>
            {sec?.intro && <p className="mt-4 max-w-md text-muted">{sec.intro}</p>}
          </div>
          <Link href="/products" className="btn-ghost w-fit">All products <ArrowUpRight size={16} /></Link>
        </div>
        <ul className={`grid gap-6 ${list.length === 1 ? "md:grid-cols-1" : list.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
          {list.map((p) => {
            const href = `/products/${productSlug(p)}`;
            const buy = productBuyLink(p, content.contact.whatsapp);
            return (
              <li key={p.id} className="group flex flex-col overflow-hidden rounded-[28px] border border-line bg-white transition duration-300 hover:-translate-y-1 hover:border-ink hover:shadow-[0_24px_50px_-30px_rgba(20,16,40,0.4)]">
                <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-mist" aria-label={p.name}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sized(p.image, 960)} alt={`${p.name} screenshot`} loading="lazy" className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.03]" />
                  ) : (
                    <span className="grid h-full place-items-center text-lav-300"><Package size={44} /></span>
                  )}
                  {p.category && <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink shadow-sm">{p.category}</span>}
                </Link>
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <h3 className="font-display text-2xl font-semibold tracking-tight"><Link href={href} className="hover:text-lav-700">{p.name}</Link></h3>
                  <p className="mt-2 line-clamp-3 text-muted">{p.tagline || p.description}</p>
                  <p className="mt-5 text-sm"><span className="text-muted">Price </span><span className="font-semibold">{p.price || "Price on request"}</span></p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-6">
                    {buy ? (
                      <a href={buy} target="_blank" rel="noreferrer" className="btn-dark px-5 py-2.5 text-sm" data-buy-now><WhatsAppIcon size={16} /> Buy now</a>
                    ) : (
                      <Link href={`${href}#demo`} className="btn-dark px-5 py-2.5 text-sm">Free demo <ArrowUpRight size={16} /></Link>
                    )}
                    <Link href={href} className="btn-ghost px-5 py-2.5 text-sm">Details</Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
