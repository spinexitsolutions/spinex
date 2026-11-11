import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { productSlug, type Product } from "@/lib/content";
import { sized } from "@/lib/img";

const TONES: Record<string, string> = {
  "": "#2a1f6b",
  purple: "#2a1f6b",
  orange: "#5a3a08",
  pink: "#5a1240",
  blue: "#163a7a",
  green: "#0f3d2a",
};

// Products page: one big card at the top, the rest in pairs. A product left on its own
// becomes a wide card too, so the grid never has an empty gap however many products there are.
export default function ProductsGrid({ products, whatsapp }: { products: Product[]; whatsapp: string }) {
  const fi = Math.max(0, products.findIndex((p) => p.page === "featured"));
  const first = products[fi];
  const rest = products.filter((_, i) => i !== fi);
  const pairs = rest.length - (rest.length % 2);
  return (
    <div className="space-y-6 sm:space-y-7">
      {first && <Wide p={first} whatsapp={whatsapp} />}
      {pairs > 0 && (
        <div className="grid gap-6 sm:gap-7 md:grid-cols-2">
          {rest.slice(0, pairs).map((p) => <Card key={p.id} p={p} whatsapp={whatsapp} />)}
        </div>
      )}
      {rest.length % 2 === 1 && <Wide p={rest[rest.length - 1]} whatsapp={whatsapp} flip />}
    </div>
  );
}

function Visual({ p, big }: { p: Product; big?: boolean }) {
  const tone = TONES[p.cardTone ?? ""] ?? TONES[""];
  return (
    <div className="relative h-full overflow-hidden text-white" style={{ background: `radial-gradient(110% 110% at 0% 0%, ${tone}, #0e0b17 70%)` }}>
      {p.cardImage ? (
        <img src={sized(p.cardImage, 1600)} alt={`${p.name} preview`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]" />
      ) : (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:18px_18px]" />
          {p.image && (
            <div className={`absolute bottom-0 right-0 overflow-hidden rounded-tl-[14px] bg-[#1d1a26] shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)] ${big ? "left-[7%] top-[22%]" : "left-[9%] top-[26%]"}`}>
              <div className="flex gap-1.5 px-3 py-2.5" aria-hidden><i className="h-2 w-2 rounded-full bg-white/20" /><i className="h-2 w-2 rounded-full bg-white/20" /><i className="h-2 w-2 rounded-full bg-white/20" /></div>
              <img src={sized(p.image, 1280)} alt={`${p.name} screenshot`} loading="lazy" decoding="async" className="block w-full object-cover object-top" />
            </div>
          )}
        </>
      )}
      <div className="absolute left-6 top-6 flex items-center gap-2.5 sm:left-8 sm:top-8">
        <span className="flex items-center gap-1.5 font-display text-[17px] font-semibold tracking-tight">
          <img src="/brand/icon.svg" alt="" className="h-5 w-5" /> Spinex
        </span>
        {p.status && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${p.status === "Live" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/80"}`}>
            {p.status === "Live" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />}{p.status}
          </span>
        )}
      </div>
    </div>
  );
}

function Info({ p, whatsapp, big }: { p: Product; whatsapp: string; big?: boolean }) {
  const href = `/products/${productSlug(p)}`;
  const [main, ...more] = (p.price || "Price on request").split(/,\s*/);
  const demo = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi Spinex, I'd like a free demo of ${p.name}.`)}`;
  return (
    <div className={`flex flex-1 flex-col ${big ? "p-7 sm:p-10" : "p-7 sm:p-8"}`}>
      {(p.audience || p.category) && <p className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-lav-700">{p.audience || p.category}</p>}
      <h2 className={`mt-2 font-display font-semibold tracking-[-0.035em] ${big ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>
        <Link href={href} className="hover:text-lav-700">{p.name}</Link>
      </h2>
      <p className="mt-3 text-[16.5px] leading-relaxed text-muted">{p.tagline || p.description}</p>
      {p.features.length > 0 && (
        <ul className="mb-7 mt-6 grid gap-3">
          {p.features.slice(0, big ? 4 : 3).map((f) => (
            <li key={f} className="flex gap-3 text-[15px] leading-snug">
              <span className="mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-lav-100 text-lav-600"><Check size={13} strokeWidth={3} /></span>
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <div>
          <p className="font-display text-[22px] font-semibold tracking-tight">{main}</p>
          {more.length > 0 && <p className="text-[13px] text-muted">{more.join(" · ")}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {whatsapp && (
            <a href={demo} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white transition hover:brightness-105">
              <WhatsAppIcon size={16} /> Free demo
            </a>
          )}
          <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-lav-700">
            View product <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Wide({ p, whatsapp, flip = false }: { p: Product; whatsapp: string; flip?: boolean }) {
  return (
    <article className="group grid overflow-hidden rounded-[32px] border border-line bg-white shadow-[0_40px_80px_-50px_rgba(18,15,27,0.4)] lg:grid-cols-[1.25fr_1fr]">
      <div className={`aspect-[4/3] lg:aspect-auto lg:min-h-[520px] ${flip ? "lg:order-2" : ""}`}><Visual p={p} big /></div>
      <Info p={p} whatsapp={whatsapp} big />
    </article>
  );
}

function Card({ p, whatsapp }: { p: Product; whatsapp: string }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-[32px] border border-line bg-white">
      <div className="aspect-[16/9]"><Visual p={p} /></div>
      <Info p={p} whatsapp={whatsapp} />
    </article>
  );
}
