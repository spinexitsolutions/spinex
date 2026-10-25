import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CheckCircle2, MapPin } from "lucide-react";
import { getContent } from "@/lib/content-server";
import { cityPath, citySlug, projectSlug, type CityPage, type SiteContent } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import QuickContact from "@/components/home/QuickContact";

// Local SEO page for one city, shown at /website-development-<city> (next.config rewrites it here).
// Everything comes from Admin → City pages.
type Props = { params: { slug: string } };

const findCity = (content: SiteContent, slug: string) => (content.cities ?? []).find((c) => c.show && citySlug(c) === slug);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const content = await getContent();
  const c = findCity(content, params.slug);
  if (!c) notFound(); // here too, so the 404 status is set before the page starts streaming
  const title = c.metaTitle || `${c.heading} | ${content.brand.name}`;
  const description = c.metaDescription || c.intro.slice(0, 160);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: cityPath(c) },
    openGraph: { title, description, url: cityPath(c), type: "website", images: ["/og-image.jpg"] },
  };
}

export default async function CityPageView({ params }: Props) {
  const content = await getContent();
  const c = findCity(content, params.slug);
  if (!c) notFound();
  const contact = content.contact;
  const projects = content.projects.filter((p) => !p.hidePage).slice(0, 3);
  const quotes = content.testimonials.filter((t) => String(t.quote || "").trim()).slice(0, 2);
  const otherPages = (content.cities ?? []).filter((x) => x.show && x.id !== c.id);
  const linked = new Map(otherPages.map((x) => [x.city.trim().toLowerCase(), x]));
  const nearby = Array.from(new Set([...otherPages.map((x) => x.city), ...c.nearby].map((n) => n.trim()).filter(Boolean)));
  const wa = contact.whatsapp ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Hi Spinex, I need a website in ${c.city}.`)}` : "";

  return (
    <>
      <CityJsonLd c={c} content={content} />

      <section className="relative overflow-hidden bg-ink pb-20 pt-36 text-white sm:pb-24 sm:pt-44">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-lav-600/25 blur-[130px]" />
        <div className="container-x relative">
          <nav aria-label="Breadcrumb" className="text-sm text-white/50">
            <Link href="/" className="hover:text-white">Home</Link> <span aria-hidden>›</span> <Link href="/services" className="hover:text-white">Services</Link> <span aria-hidden>›</span> <span className="text-white/80">{c.city}</span>
          </nav>
          <p className="mt-8 font-semibold uppercase tracking-[0.14em] text-lav-300">{[c.city, c.state].filter(Boolean).join(", ")}</p>
          <h1 className="h-display mt-3 max-w-4xl text-4xl sm:text-6xl lg:text-7xl">{c.heading}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">{c.intro}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="#enquiry" className="btn-light px-6 py-3.5">Get a free quote <ArrowUpRight size={16} /></Link>
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 font-semibold hover:bg-white/10">WhatsApp us</a>}
            {contact.phone && <a href={`tel:+91${contact.phone}`} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 font-semibold hover:bg-white/10">Call +91 {contact.phone}</a>}
          </div>
        </div>
      </section>

      {c.stats.length > 0 && (
        <section className="bg-white pt-14">
          <div className="container-x grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.stats.filter((s) => s.value.trim()).map((s) => (
              <div key={s.id} className="rounded-[24px] border border-line p-6">
                <p className="font-display text-3xl font-semibold tracking-tight">{s.value}</p>
                <p className="mt-1 text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {c.services.length > 0 && (
        <section className="bg-white py-20 sm:py-24">
          <div className="container-x">
            <p className="font-semibold uppercase tracking-[0.14em] text-lav-700">What we do in {c.city}</p>
            <h2 className="h-display mt-3 text-3xl sm:text-5xl">Services for {c.city} businesses</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {c.services.filter((s) => s.title.trim()).map((s) => (
                <div key={s.id} className="rounded-[24px] border border-line bg-white p-7 transition hover:border-lav-300 hover:shadow-[0_20px_50px_-30px_rgba(18,15,27,.35)]">
                  <span className="rounded-full bg-lav-100 px-3 py-1 text-xs font-semibold text-lav-700">{c.city}</span>
                  <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.text}</p>
                </div>
              ))}
            </div>
            <Link href="/services" className="mt-8 inline-flex items-center gap-1.5 font-semibold text-lav-700 hover:underline">See all our services <ArrowUpRight size={15} /></Link>
          </div>
        </section>
      )}

      {(projects.length > 0 || quotes.length > 0) && (
        <section className="bg-mist py-20 sm:py-24">
          <div className="container-x">
            <p className="font-semibold uppercase tracking-[0.14em] text-lav-700">Our work</p>
            <h2 className="h-display mt-3 text-3xl sm:text-5xl">Recent projects</h2>
            {projects.length > 0 && (
              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {projects.map((p) => (
                  <Link key={p.id} href={`/work/${projectSlug(p)}`} className="group overflow-hidden rounded-[24px] border border-line bg-white">
                    {p.image ? <img src={p.image} alt={p.title} loading="lazy" className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="aspect-[16/10] bg-lav-100" />}
                    <div className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{p.category}</p>
                      <p className="mt-1 font-display text-lg font-semibold">{p.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {quotes.length > 0 && (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {quotes.map((q) => (
                  <figure key={q.id} className="rounded-[24px] bg-ink p-7 text-white">
                    <blockquote className="font-display text-lg leading-snug">“{q.quote.trim()}”</blockquote>
                    <figcaption className="mt-4 text-sm text-white/60"><b className="text-white">{q.name}</b>{q.role ? `, ${q.role}` : ""}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="bg-white py-20 sm:py-24">
        <div className="container-x grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {c.why.length > 0 && (
            <div className="rounded-[28px] bg-ink p-8 text-white sm:p-10">
              <p className="font-semibold uppercase tracking-[0.14em] text-lav-300">Why a local team</p>
              <h2 className="h-display mt-3 text-3xl sm:text-4xl">We know {c.city}.</h2>
              <ul className="mt-7 space-y-3">
                {c.why.map((w) => <li key={w} className="flex gap-3 text-white/80"><CheckCircle2 size={19} className="mt-0.5 shrink-0 text-lav-300" /> {w}</li>)}
              </ul>
            </div>
          )}
          <div className="rounded-[28px] border border-line p-8 sm:p-10">
            <h2 className="font-display text-2xl font-semibold">Areas we serve in {c.city}</h2>
            {c.areas.length > 0 && <p className="mt-4 leading-[2] text-muted">{c.areas.join(" · ")}</p>}
            {contact.location && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(contact.location)}`} target="_blank" rel="noreferrer" className="mt-6 flex items-center gap-3 rounded-2xl bg-mist p-4 hover:bg-lav-100">
                <MapPin size={20} className="shrink-0 text-lav-700" />
                <span><span className="block text-sm text-muted">Our office</span><span className="font-semibold">{contact.location}</span></span>
                <ArrowUpRight size={16} className="ml-auto shrink-0 text-muted" />
              </a>
            )}
          </div>
        </div>
      </section>

      {c.faqs.length > 0 && (
        <section className="bg-mist py-20 sm:py-24">
          <div className="container-x max-w-4xl">
            <p className="font-semibold uppercase tracking-[0.14em] text-lav-700">FAQ</p>
            <h2 className="h-display mt-3 text-3xl sm:text-5xl">Questions from {c.city} businesses</h2>
            <div className="mt-10 space-y-3">
              {c.faqs.filter((f) => f.q.trim()).map((f, i) => (
                <details key={f.id} open={i === 0} className="group rounded-[20px] border border-line bg-white px-6 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {f.q}
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-lg transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <div id="enquiry" className="scroll-mt-24">
        <QuickContact source="city" note={`Enquiry from the ${c.city} page`} />
      </div>

      {nearby.length > 0 && (
        <section className="border-t border-line bg-white py-10">
          <div className="container-x text-sm text-muted">
            <span className="font-semibold text-ink">We also work with businesses in </span>
            {nearby.map((n, i) => {
              const page = linked.get(n.toLowerCase());
              return (
                <span key={n}>
                  {i > 0 && ", "}
                  {page ? <Link href={cityPath(page)} className="font-semibold text-lav-700 hover:underline">website development in {page.city}</Link> : n}
                </span>
              );
            })}
            . <Link href="/contact" className="font-semibold text-lav-700 hover:underline">Contact us</Link> from anywhere in India.
          </div>
        </section>
      )}
    </>
  );
}

// LocalBusiness + FAQ structured data for this city.
function CityJsonLd({ c, content }: { c: CityPage; content: SiteContent }) {
  const url = `${SITE_URL}${cityPath(c)}`;
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": `${url}#business`,
      name: content.brand.name,
      url,
      description: c.metaDescription || c.intro,
      telephone: content.contact.phone ? `+91${content.contact.phone}` : undefined,
      email: content.contact.email || undefined,
      image: `${SITE_URL}/og-image.jpg`,
      address: { "@type": "PostalAddress", streetAddress: content.contact.location || undefined, addressLocality: "Jaipur", addressRegion: "Rajasthan", addressCountry: "IN" },
      areaServed: [{ "@type": "City", name: c.city }, ...c.areas.slice(0, 20).map((a) => ({ "@type": "Place", name: `${a}, ${c.city}` }))],
      makesOffer: c.services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: `${s.title} in ${c.city}`, description: s.text } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
        { "@type": "ListItem", position: 3, name: c.city, item: url },
      ],
    },
    ...(c.faqs.length
      ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faqs.filter((f) => f.q.trim()).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]
      : []),
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
