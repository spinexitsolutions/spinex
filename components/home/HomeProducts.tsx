import Link from "next/link";
import { ArrowUpRight, Check, Package } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { productBuyLink, productSlug, type Product, type SiteContent } from "@/lib/content";
import { sized } from "@/lib/img";

// Home page "Our products": one product as a big dark card, up to four more as small cards under it.
// Which is big, small or hidden is set per product in Admin → Products ("On the home page").
// The whole section is switched on or off in Admin → Home page.
export default function HomeProducts({ content }: { content: SiteContent }) {
  const shown = content.products.filter((p) => p.name && p.home !== "hide");
  if (!shown.length) return null;
  const big = shown.find((p) => p.home === "featured") ?? shown[0];
  const small = shown.filter((p) => p !== big).slice(0, 4);
  const sec = content.sections.products;
  const wa = content.contact.whatsapp;

  return (
    <section className="bg-white py-20 sm:py-28" data-home-products>
      <div className="container-x">
        <div className="mb-8 flex flex-col justify-between gap-6 sm:mb-10 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.16em] text-lav-600 sm:text-[13px]">Our products</p>
            <h2 className="h-display text-4xl sm:text-6xl">{sec?.heading || "Software we built."}</h2>
            {sec?.intro && <p className="mt-4 max-w-xl text-muted sm:text-lg">{sec.intro}</p>}
          </div>
          <Link href="/products" className="btn-ghost w-fit shrink-0">All products <ArrowUpRight size={16} /></Link>
        </div>

        <Big p={big} wa={wa} />

        {small.length > 0 && (
          <ul className={`mt-4 grid gap-4 sm:mt-5 sm:gap-5 ${small.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {small.map((p) => <Small key={p.id} p={p} wa={wa} />)}
          </ul>
        )}
      </div>
    </section>
  );
}

const points = (p: Product, n: number) => ((p.homePoints?.length ? p.homePoints : p.features) ?? []).filter(Boolean).slice(0, n);

function Pt({ text, dark }: { text: string; dark?: boolean }) {
  return (
    <li className={`flex items-start gap-2.5 text-[14.5px] leading-snug ${dark ? "text-white/85" : "text-ink/75"}`}>
      <span className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full ${dark ? "bg-white text-ink" : "bg-lav-100 text-lav-700"}`}><Check size={12} strokeWidth={3} /></span>
      {text}
    </li>
  );
}

function Shot({ p, className }: { p: Product; className: string }) {
  return p.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={sized(p.image, 1200)} alt={`${p.name} screenshot`} loading="lazy" className={className} />
  ) : (
    <span className={`grid place-items-center bg-lav-100 text-lav-300 ${className}`}><Package size={44} /></span>
  );
}

function Big({ p, wa }: { p: Product; wa: string }) {
  const href = `/products/${productSlug(p)}`;
  const buy = productBuyLink(p, wa);
  const live = /live/i.test(p.status || "");
  const tryLabel = /free/i.test(p.price || "") ? "Try it free" : "See it live";
  return (
    <article className="relative grid overflow-hidden rounded-[26px] bg-ink text-white sm:rounded-[32px] lg:grid-cols-[1fr_1.15fr]" data-product-big>
      <div aria-hidden className="pointer-events-none absolute -right-28 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(110,89,217,0.45),transparent_65%)]" />
      <div className="relative p-6 sm:p-10 lg:p-12">
        <div className="flex flex-wrap gap-2">
          {p.status && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${live ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/80"}`}>
              {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}{p.status}
            </span>
          )}
          {p.category && <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/80">{p.category}</span>}
        </div>
        <h3 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl"><Link href={href} className="hover:text-lav-200">{p.name}</Link></h3>
        <p className="mt-3 max-w-md text-white/60 sm:text-[17px]">{p.tagline || p.description}</p>
        <ul className="mt-6 grid gap-3">{points(p, 3).map((t) => <Pt key={t} text={t} dark />)}</ul>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          {buy ? (
            <a href={buy} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-semibold text-white" data-buy-now><WhatsAppIcon size={16} /> Buy on WhatsApp</a>
          ) : p.demoUrl ? (
            <a href={p.demoUrl} target="_blank" rel="noreferrer" className="btn-light px-5 py-2.5 text-sm">{tryLabel} <ArrowUpRight size={16} /></a>
          ) : (
            <Link href={`${href}#demo`} className="btn-light px-5 py-2.5 text-sm">Free demo <ArrowUpRight size={16} /></Link>
          )}
          <Link href={href} className="text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline">Details</Link>
          {p.price && <span className="w-full text-sm text-white/55 sm:w-auto">{p.price}</span>}
        </div>
      </div>
      <Link href={href} tabIndex={-1} aria-hidden className="relative block pl-6 pt-2 sm:pl-10 lg:pl-2 lg:pt-12">
        <Shot p={p} className="block h-full max-h-[460px] w-full rounded-tl-2xl object-cover object-left-top shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]" />
      </Link>
    </article>
  );
}

function Small({ p, wa }: { p: Product; wa: string }) {
  const href = `/products/${productSlug(p)}`;
  const buy = productBuyLink(p, wa);
  return (
    <li className="group grid overflow-hidden rounded-[24px] border border-line bg-white transition duration-300 hover:border-ink/40 hover:shadow-[0_24px_50px_-30px_rgba(20,16,40,0.4)] sm:grid-cols-[200px_1fr] sm:rounded-[28px] xl:grid-cols-[220px_1fr]" data-product-small>
      <Link href={href} tabIndex={-1} aria-hidden className="block h-40 overflow-hidden bg-mist sm:h-full">
        <Shot p={p} className="h-full w-full object-cover object-left-top transition duration-700 group-hover:scale-[1.03]" />
      </Link>
      <div className="flex flex-col p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {p.category && <span className="rounded-full bg-lav-100 px-3 py-1 text-xs font-semibold text-lav-700">{p.category}</span>}
          {p.price && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{p.price}</span>}
        </div>
        <h3 className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-[22px]"><Link href={href} className="hover:text-lav-700">{p.name}</Link></h3>
        <p className="mt-1.5 line-clamp-2 text-[14.5px] text-muted">{p.tagline || p.description}</p>
        {points(p, 2).length > 0 && <ul className="mt-3 hidden gap-2 sm:grid">{points(p, 2).map((t) => <Pt key={t} text={t} />)}</ul>}
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {buy ? (
            <a href={buy} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white" data-buy-now><WhatsAppIcon size={16} /> Buy on WhatsApp</a>
          ) : (
            <Link href={`${href}#demo`} className="btn-dark px-4 py-2 text-sm">Free demo <ArrowUpRight size={15} /></Link>
          )}
          <Link href={href} className="btn-ghost px-4 py-2 text-sm">Details</Link>
        </div>
      </div>
    </li>
  );
}
