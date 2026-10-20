import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, ChevronRight, Plus } from "lucide-react";
import { getContent } from "@/lib/content-server";
import { projectSlug, serviceSlug, type Service } from "@/lib/content";
import { renderMarkdown } from "@/lib/posts";
import { SITE_URL } from "@/lib/site";
import ContactForm from "@/components/ContactForm";

type Props = { params: { slug: string } };

const findService = (services: Service[], slug: string) => services.find((s) => serviceSlug(s) === slug || s.id === slug);

function parseFaqs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim().split("\n"))
    .filter((lines) => lines.length >= 2 && lines[0].trim())
    .map(([q, ...a]) => ({ q: q.trim(), a: a.join(" ").trim() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const content = await getContent();
  const s = findService(content.services, params.slug);
  if (!s) return { title: "Service not found" };
  const title = s.seoTitle || `${s.title} in Jaipur | ${content.brand.name}`;
  const description = s.seoDescription || s.description;
  return {
    title: { absolute: title },
    description,
    keywords: [`${s.title.toLowerCase()} Jaipur`, `${s.title.toLowerCase()} company in Jaipur`, ...s.tags],
    alternates: { canonical: `/services/${serviceSlug(s)}` },
    openGraph: { title, description, url: `/services/${serviceSlug(s)}`, images: s.image ? [{ url: s.image }] : ["/og-image.jpg"] },
  };
}

export default async function ServicePage({ params }: Props) {
  const content = await getContent();
  const s = findService(content.services, params.slug);
  if (!s) notFound();
  const slug = serviceSlug(s);
  const { html } = renderMarkdown(s.body || s.description);
  const faqs = parseFaqs(s.faqs || "");
  const projects = content.projects.filter((p) => p.category.toLowerCase() === s.title.toLowerCase()).slice(0, 3);
  const others = content.services.filter((x) => x.id !== s.id);
  const url = `${SITE_URL}/services/${slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: s.title,
      description: s.seoDescription || s.description,
      serviceType: s.title,
      url,
      areaServed: [{ "@type": "City", name: "Jaipur" }, { "@type": "Country", name: "India" }],
      provider: { "@id": `${SITE_URL}/#business` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
        { "@type": "ListItem", position: 3, name: s.title, item: url },
      ],
    },
    ...(faqs.length
      ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]
      : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="relative flex min-h-[70svh] items-end overflow-hidden bg-ink text-white">
        {s.image && <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/50" />
        <div className="container-x relative w-full pb-16 pt-36">
          <nav aria-label="Breadcrumb">
            <ol className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-white/15 bg-ink/40 px-4 py-2 text-sm text-white/70 backdrop-blur">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              <li aria-hidden><ChevronRight size={14} /></li>
              <li><Link href="/services" className="hover:text-white">Services</Link></li>
              <li aria-hidden><ChevronRight size={14} /></li>
              <li aria-current="page" className="text-white">{s.title}</li>
            </ol>
          </nav>
          <h1 className="h-display mt-6 max-w-4xl text-5xl sm:text-7xl">{s.title} in Jaipur</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">{s.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#quote" className="btn-light">Get a free quote <ArrowUpRight size={17} /></a>
            <a href={`https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(`Hi Spinex, I want to know about ${s.title.toLowerCase()}.`)}`} target="_blank" rel="noreferrer" className="btn-ghost-dark">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_340px]">
          <article className="prose-spinex max-w-3xl" dangerouslySetInnerHTML={{ __html: html }} />
          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            {s.features.length > 0 && (
              <div className="rounded-[24px] border border-line p-6">
                <h2 className="font-display text-xl font-semibold">What you get</h2>
                <ul className="mt-4 space-y-3">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[15px]">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lav-100 text-lav-700"><Check size={13} /></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-[24px] bg-ink p-6 text-white">
              <p className="font-display text-xl font-semibold">Talk to us about {s.title.toLowerCase()}</p>
              <p className="mt-2 text-sm text-white/65">Free call, clear written quote, usually within a day.</p>
              <a href="#quote" className="btn-light mt-5 w-full py-3 text-sm">Get a quote <ArrowUpRight size={15} /></a>
              <a href={`tel:+91${content.contact.phone}`} className="mt-3 block text-center text-sm text-white/70 hover:text-white">or call +91 {content.contact.phone}</a>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-mist py-16 sm:py-20">
        <div className="container-x">
          <h2 className="h-display text-3xl sm:text-5xl">How we work</h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.process.map((p, i) => (
              <li key={p.id} className="rounded-[24px] border border-line bg-white p-6">
                <span className="font-display text-4xl font-semibold text-lav-300">{i + 1}</span>
                <h3 className="mt-3 font-display text-xl font-semibold">{p.title}</h3>
                <p className="mt-1 text-xs font-medium text-lav-700">{p.time}</p>
                <p className="mt-2 text-sm text-muted">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {projects.length > 0 && (
        <section className="bg-white py-16 sm:py-20">
          <div className="container-x">
            <h2 className="h-display text-3xl sm:text-5xl">Recent {s.title.toLowerCase()} work</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {projects.map((p) => (
                <article key={p.id} className="group relative overflow-hidden rounded-[24px] border border-line transition hover:border-ink">
                  {p.image && <img src={p.image} alt={p.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
                  <div className="p-5">
                    {p.type === "demo" && <span className="mb-2 inline-block rounded-full bg-lav-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lav-700">Demo</span>}
                    <h3 className="font-display text-lg font-semibold">
                      {p.hidePage ? p.title : <Link href={`/work/${projectSlug(p)}`} className="after:absolute after:inset-0">{p.title}</Link>}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{p.summary}</p>
                    {!p.hidePage && <p className="mt-3 text-sm font-semibold text-lav-700">View case study →</p>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="bg-white py-16 sm:py-20">
          <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.5fr]">
            <h2 className="h-display text-3xl sm:text-5xl">{s.title}: common questions</h2>
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

      <section id="quote" className="scroll-mt-24 bg-mist py-16 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="h-display text-3xl sm:text-5xl">Get a quote for {s.title.toLowerCase()}</h2>
            <p className="mt-4 text-muted">Tell us a little about your project. We reply within a day.</p>
            <div className="mt-8">
              <p className="text-sm font-semibold">Other services</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {others.map((o) => (
                  <li key={o.id}><Link href={`/services/${serviceSlug(o)}`} className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-4 text-sm hover:border-ink">{o.title}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <ContactForm defaultService={s.title} />
        </div>
      </section>
    </>
  );
}
