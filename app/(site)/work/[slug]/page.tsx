import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, Quote } from "lucide-react";
import { getContent } from "@/lib/content-server";
import { projectSlug, type Project } from "@/lib/content";
import { renderMarkdown } from "@/lib/posts";
import { SITE_URL } from "@/lib/site";
import ContactForm from "@/components/ContactForm";
import ProjectStage from "@/components/home/ProjectFrames";

type Props = { params: { slug: string } };

// Case study pages: /work/<slug>. Everything here is edited in Admin → Projects.
const findProject = (list: Project[], slug: string) => list.find((p) => !p.hidePage && (projectSlug(p) === slug || p.id === slug));
const liveUrl = (u?: string) => (u && (/^https?:\/\//i.test(u) || (u.startsWith("/") && !u.startsWith("//"))) ? u : "");
const abs = (u: string) => (u.startsWith("http") ? u : `${SITE_URL}${u}`);

function splitResult(text: string) {
  const i = text.indexOf(":");
  return i > 0 ? { label: text.slice(0, i).trim(), value: text.slice(i + 1).trim() } : { label: "", value: text.trim() };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const content = await getContent();
  const p = findProject(content.projects, params.slug);
  if (!p) return { title: "Project not found" };
  const title = p.seoTitle || `${p.title}${p.category ? ` – ${p.category}` : ""} case study | ${content.brand.name}`;
  const description = p.seoDescription || p.summary || `How ${content.brand.name} delivered ${p.title}.`;
  const path = `/work/${projectSlug(p)}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "article", images: p.image ? [{ url: p.image }] : ["/og-image.jpg"] },
  };
}

export default async function ProjectPage({ params }: Props) {
  const content = await getContent();
  const p = findProject(content.projects, params.slug);
  if (!p) notFound();

  const list = content.projects.filter((x) => !x.hidePage);
  const i = list.findIndex((x) => x.id === p.id);
  const prev = list.length > 1 ? list[(i - 1 + list.length) % list.length] : null;
  const next = list.length > 1 ? list[(i + 1) % list.length] : null;
  const url = liveUrl(p.url);
  const results = (p.results ?? []).map((r) => r.trim()).filter(Boolean);
  const gallery = (p.images ?? []).filter(Boolean);
  const sections = [
    { id: "challenge", title: "The challenge", text: p.challenge },
    { id: "solution", title: "What we did", text: p.solution },
    { id: "outcome", title: "The result", text: p.outcome },
  ].filter((s) => s.text?.trim());
  const facts = [
    ["Client", p.client],
    ["Industry", p.industry],
    ["Year", p.year],
    ["Timeline", p.duration],
    ["Category", p.category],
  ].filter(([, v]) => v?.trim()) as [string, string][];
  const pageUrl = `${SITE_URL}/work/${projectSlug(p)}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: p.title,
      description: p.seoDescription || p.summary,
      url: pageUrl,
      ...(p.image ? { image: abs(p.image) } : {}),
      ...(p.year ? { dateCreated: p.year } : {}),
      creator: { "@id": `${SITE_URL}/#business` },
      ...(p.quote ? { review: { "@type": "Review", reviewBody: p.quote, author: { "@type": "Person", name: p.quoteBy || p.client || "Client" } } } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Work", item: `${SITE_URL}/work` },
        { "@type": "ListItem", position: 3, name: p.title, item: pageUrl },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-mist pb-16 pt-32 sm:pt-36">
        <div className="container-x">
          <nav aria-label="Breadcrumb">
            <ol className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm text-muted">
              <li><Link href="/" className="hover:text-ink">Home</Link></li>
              <li aria-hidden><ChevronRight size={14} /></li>
              <li><Link href="/work" className="hover:text-ink">Work</Link></li>
              <li aria-hidden><ChevronRight size={14} /></li>
              <li aria-current="page" className="text-ink">{p.title}</li>
            </ol>
          </nav>
          <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {p.category && <span className="rounded-full bg-lav-100 px-3 py-1 text-xs font-semibold text-lav-700">{p.category}</span>}
                {p.type === "demo" && <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Demo project</span>}
              </div>
              <h1 className="h-display mt-5 text-4xl sm:text-6xl">{p.title}</h1>
              {p.summary && <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{p.summary}</p>}
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#quote" className="btn-dark">Get similar results <ArrowUpRight size={17} /></a>
                {url && <a href={url} target="_blank" rel="noreferrer" className="btn-ghost bg-white">Visit site <ArrowUpRight size={16} /></a>}
              </div>
            </div>
            <div className="w-full min-w-0">
              <ProjectStage project={p} open play />
            </div>
          </div>
        </div>
      </section>

      {/* Key results */}
      {results.length > 0 && (
        <section className="bg-ink py-14 text-white">
          <div className="container-x grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {results.slice(0, 4).map((r) => {
              const { label, value } = splitResult(r);
              return (
                <div key={r} className="border-l border-white/15 pl-5">
                  <p className="h-display text-3xl sm:text-4xl">{value}</p>
                  {label && <p className="mt-2 text-sm text-white/60">{label}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Story + facts */}
      <section className="bg-white py-16 sm:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_320px]">
          <div className="space-y-14">
            {sections.length === 0 && p.summary && <p className="text-lg leading-relaxed text-ink/80">{p.summary}</p>}
            {sections.map((s, n) => (
              <article key={s.id} id={s.id} className="scroll-mt-28">
                <p className="font-display text-sm font-semibold text-lav-700">0{n + 1}</p>
                <h2 className="h-display mt-2 text-3xl sm:text-4xl">{s.title}</h2>
                <div className="prose-spinex mt-5 max-w-3xl" dangerouslySetInnerHTML={{ __html: renderMarkdown(s.text ?? "").html }} />
              </article>
            ))}
          </div>
          {(facts.length > 0 || (p.services ?? []).length > 0) && (
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[24px] border border-line p-6">
                <h2 className="font-display text-lg font-semibold">Project details</h2>
                {facts.length > 0 && (
                  <dl className="mt-4 divide-y divide-line">
                    {facts.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-3 text-[15px]">
                        <dt className="text-muted">{k}</dt>
                        <dd className="text-right font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {(p.services ?? []).length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted">What we did</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {(p.services ?? []).map((s) => <li key={s} className="rounded-full bg-mist px-3 py-1 text-sm">{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="bg-mist py-16 sm:py-20">
          <div className="container-x">
            <h2 className="h-display text-3xl sm:text-4xl">Gallery</h2>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((src, n) => (
                <li key={src + n}>
                  <a href={src} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-[20px] border border-line bg-white">
                    <img src={src} alt={`${p.title} image ${n + 1}`} loading="lazy" className="aspect-[4/3] w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Client quote */}
      {p.quote?.trim() && (
        <section className="bg-white py-16 sm:py-24">
          <figure className="container-x max-w-4xl">
            <Quote size={36} className="text-lav-300" aria-hidden />
            <blockquote className="mt-4 font-display text-2xl font-medium leading-snug tracking-tight sm:text-4xl">“{p.quote}”</blockquote>
            {p.quoteBy && <figcaption className="mt-6 text-muted">{p.quoteBy}</figcaption>}
          </figure>
        </section>
      )}

      {/* Previous / next */}
      {prev && next && (
        <nav aria-label="More projects" className="border-y border-line bg-white">
          <div className="container-x grid sm:grid-cols-2">
            <Link href={`/work/${projectSlug(prev)}`} className="group flex items-center gap-4 py-8 sm:pr-8">
              <ArrowLeft size={20} className="shrink-0 text-muted transition group-hover:-translate-x-1 group-hover:text-ink" />
              <span><span className="block text-sm text-muted">Previous project</span><span className="font-display text-lg font-semibold">{prev.title}</span></span>
            </Link>
            <Link href={`/work/${projectSlug(next)}`} className="group flex items-center justify-end gap-4 border-t border-line py-8 text-right sm:border-l sm:border-t-0 sm:pl-8">
              <span><span className="block text-sm text-muted">Next project</span><span className="font-display text-lg font-semibold">{next.title}</span></span>
              <ArrowRight size={20} className="shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-ink" />
            </Link>
          </div>
        </nav>
      )}

      {/* Enquiry */}
      <section id="quote" className="scroll-mt-24 bg-mist py-16 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="h-display text-3xl sm:text-5xl">Want results like this?</h2>
            <p className="mt-4 text-muted">Tell us about your business and we&apos;ll reply within a day with ideas and a clear quote.</p>
            <Link href="/work" className="btn-ghost mt-8 inline-flex bg-white"><ArrowLeft size={16} /> All projects</Link>
          </div>
          <ContactForm defaultService={p.category} />
        </div>
      </section>
    </>
  );
}
