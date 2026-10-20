import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, ChevronRight, ExternalLink, Play, Plus, Users } from "lucide-react";
import { getContent } from "@/lib/content-server";
import { productSlug, type Product } from "@/lib/content";
import { renderMarkdown } from "@/lib/posts";
import { SITE_URL } from "@/lib/site";
import ContactForm from "@/components/ContactForm";

type Props = { params: { slug: string } };

const findProduct = (list: Product[], slug: string) => list.find((p) => productSlug(p) === slug || p.id === slug);

function parseFaqs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim().split("\n"))
    .filter((lines) => lines.length >= 2 && lines[0].trim())
    .map(([q, ...a]) => ({ q: q.trim(), a: a.join(" ").trim() }));
}

// YouTube watch/share/shorts links → embed URL.
function youtubeEmbed(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const content = await getContent();
  const p = findProduct(content.products, params.slug);
  if (!p) return { title: "Product not found" };
  const title = p.seoTitle || `${p.name}${p.tagline ? ` – ${p.tagline}` : ""} | ${content.brand.name}`;
  const description = p.seoDescription || p.description || p.tagline;
  const path = `/products/${productSlug(p)}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, images: p.image ? [{ url: p.image }] : ["/og-image.jpg"] },
  };
}

export default async function ProductPage({ params }: Props) {
  const content = await getContent();
  const p = findProduct(content.products, params.slug);
  if (!p) notFound();
  const slug = productSlug(p);
  const url = `${SITE_URL}/products/${slug}`;
  const { html } = renderMarkdown(p.body || p.description || "");
  const faqs = parseFaqs(p.faqs || "");
  const video = p.videoUrl ? youtubeEmbed(p.videoUrl) : "";
  const shots = p.gallery.filter(Boolean);
  const others = content.products.filter((x) => x.id !== p.id);
  const wa = `https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(`Hi Spinex, I want a demo of ${p.name}.`)}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: p.name,
      description: p.seoDescription || p.description || p.tagline,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url,
      ...(p.image ? { image: p.image.startsWith("http") ? p.image : `${SITE_URL}${p.image}` } : {}),
      publisher: { "@id": `${SITE_URL}/#business` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Products", item: `${SITE_URL}/products` },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ],
    },
    ...(faqs.length
      ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]
      : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink pb-16 pt-32 text-white sm:pt-36">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-lav-600/30 blur-3xl" />
        <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <nav aria-label="Breadcrumb">
              <ol className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70">
                <li><Link href="/" className="hover:text-white">Home</Link></li>
                <li aria-hidden><ChevronRight size={14} /></li>
                <li><Link href="/products" className="hover:text-white">Products</Link></li>
                <li aria-hidden><ChevronRight size={14} /></li>
                <li aria-current="page" className="text-white">{p.name}</li>
              </ol>
            </nav>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {p.status && <span className="rounded-full bg-lav-600 px-3 py-1 text-xs font-semibold">{p.status}</span>}
              {p.category && <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75">{p.category}</span>}
            </div>
            <h1 className="h-display mt-5 text-5xl sm:text-6xl">{p.name}</h1>
            {p.tagline && <p className="mt-4 font-display text-xl text-lav-200 sm:text-2xl">{p.tagline}</p>}
            {p.description && <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">{p.description}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#demo" className="btn-light">Book a free demo <ArrowUpRight size={17} /></a>
              {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noreferrer" className="btn-ghost-dark">Try live demo <ExternalLink size={16} /></a>}
            </div>
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm">
              <div><dt className="text-white/50">Price</dt><dd className="mt-1 font-semibold">{p.price || "Price on request"}</dd></div>
              {p.audience && <div><dt className="text-white/50">Made for</dt><dd className="mt-1 flex items-center gap-1.5 font-semibold"><Users size={15} className="text-lav-300" /> {p.audience}</dd></div>}
            </dl>
          </div>
          {p.image && (
            <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/5 p-2 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]">
              <div className="flex gap-1.5 px-3 pb-2 pt-1" aria-hidden><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /></div>
              <img src={p.image} alt={`${p.name} screenshot`} className="w-full rounded-[14px] object-cover object-top" />
            </div>
          )}
        </div>
      </section>

      {/* Text + features */}
      <section className="bg-white py-16 sm:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_340px]">
          <article className="prose-spinex max-w-3xl" dangerouslySetInnerHTML={{ __html: html }} />
          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            {p.features.length > 0 && (
              <div className="rounded-[24px] border border-line p-6">
                <h2 className="font-display text-xl font-semibold">Key features</h2>
                <ul className="mt-4 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[15px]">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lav-100 text-lav-700"><Check size={13} /></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-[24px] bg-ink p-6 text-white">
              <p className="font-display text-xl font-semibold">See {p.name} in action</p>
              <p className="mt-2 text-sm text-white/65">A free walkthrough on call or WhatsApp, set up for your business.</p>
              <a href="#demo" className="btn-light mt-5 w-full py-3 text-sm">Book a demo <ArrowUpRight size={15} /></a>
              <a href={wa} target="_blank" rel="noreferrer" className="mt-3 block text-center text-sm text-white/70 hover:text-white">or ask on WhatsApp</a>
            </div>
          </aside>
        </div>
      </section>

      {/* Video + screenshots */}
      {(video || shots.length > 0) && (
        <section className="bg-mist py-16 sm:py-24">
          <div className="container-x">
            <h2 className="h-display text-3xl sm:text-5xl">A look inside</h2>
            {video && (
              <div className="mt-10 overflow-hidden rounded-[24px] bg-ink shadow-[0_30px_60px_-30px_rgba(18,15,27,0.5)]">
                <div className="relative aspect-video">
                  <iframe src={video} title={`${p.name} video`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full" />
                </div>
              </div>
            )}
            {shots.length > 0 && (
              <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shots.map((src, i) => (
                  <li key={src + i}>
                    <a href={src} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-[20px] border border-line bg-white">
                      <img src={src} alt={`${p.name} screenshot ${i + 1}`} loading="lazy" className="aspect-[16/10] w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {!video && p.demoUrl && (
              <a href={p.demoUrl} target="_blank" rel="noreferrer" className="btn-dark mt-8 inline-flex"><Play size={16} /> Open live demo</a>
            )}
          </div>
        </section>
      )}

      {/* FAQs */}
      {faqs.length > 0 && (
        <section className="bg-white py-16 sm:py-20">
          <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.5fr]">
            <h2 className="h-display text-3xl sm:text-5xl">{p.name}: common questions</h2>
            <div className="border-t border-line">
              {faqs.map((f) => (
                <details key={f.q} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mist transition-transform group-open:rotate-45"><Plus size={18} /></span>
                  </summary>
                  <p className="pb-5 leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Demo request */}
      <section id="demo" className="scroll-mt-24 bg-mist py-16 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="h-display text-3xl sm:text-5xl">Book a free demo of {p.name}</h2>
            <p className="mt-4 text-muted">Leave your details and we will show you how it works for your business, usually within a day.</p>
            {others.length > 0 && (
              <div className="mt-8">
                <p className="text-sm font-semibold">Other products</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {others.map((o) => (
                    <li key={o.id}><Link href={`/products/${productSlug(o)}`} className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-4 text-sm hover:border-ink">{o.name}</Link></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <ContactForm defaultService={p.name} source="product" />
        </div>
      </section>
    </>
  );
}
