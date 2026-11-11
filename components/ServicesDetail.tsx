"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useContent } from "./ContentProvider";
import { serviceSlug, type Service } from "@/lib/content";
import { ease } from "./Reveal";
import { SplitHeading } from "@/components/Reveal";
import { Stage } from "./home/ServicesList";

// Services page: services in three groups (Build, Grow, Create) as cards. Each card shows the same
// little looping animation as the home page "What we do" cards, shown larger.
const GROUPS = [
  { id: "build", label: "Build", title: "Websites, apps and software.", intro: "Everything your business runs on, built fast and made to grow.", ids: ["web", "ecommerce", "ai", "saas", "ondemand", "app"] },
  { id: "grow", label: "Grow", title: "Get found and get leads.", intro: "Ads, social media and promotion that bring real enquiries.", ids: ["marketing", "social", "promotion", "seo"] },
  { id: "create", label: "Create", title: "Videos and designs that stand out.", intro: "Reels, edits, logos and creatives made for your brand.", ids: ["video", "design"] },
];

// Card widths on a 6-column grid: 3 per row, but leftover cards get wider so rows always fill.
function spans(n: number): string[] {
  if (n === 1) return ["lg:col-span-6"];
  const out: string[] = [];
  const wide = n % 3 === 2 ? 2 : n % 3 === 1 ? 4 : 0;
  for (let i = 0; i < n; i++) out.push(i < wide ? "lg:col-span-3" : "lg:col-span-2");
  return out;
}

export default function ServicesDetail() {
  const { content } = useContent();
  const services = content.services.filter((s) => s.title);
  const used = new Set<string>();
  const groups = GROUPS.map((g) => {
    const items = services.filter((s) => g.ids.includes(s.anim || s.id) || g.ids.includes(s.id)).filter((s) => !used.has(s.id) && used.add(s.id));
    return { ...g, items };
  });
  // Services added in the admin that are not in a group yet.
  const rest = services.filter((s) => !used.has(s.id));
  if (rest.length) groups.push({ id: "more", label: "More", title: "More ways we help.", intro: "", ids: [], items: rest });
  let n = 0;

  return (
    <section className="bg-white pb-20 pt-6 sm:pb-28">
      {groups.filter((g) => g.items.length).map((g, gi) => (
        <div key={g.id} className="container-x pt-14 sm:pt-20">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-lav-700">{String(gi + 1).padStart(2, "0")} · {g.label}</p>
              <SplitHeading text={g.title} className="h-display mt-3 text-4xl sm:text-5xl" />
            </div>
            {g.intro && <p className="max-w-sm text-[15.5px] leading-relaxed text-muted">{g.intro}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {g.items.map((s, i) => {
              const span = spans(g.items.length)[i];
              return <Card key={s.id} s={s} wide={span === "lg:col-span-3" || span === "lg:col-span-6"} span={span} delay={(n++ % 3) * 0.06} />;
            })}
          </div>
        </div>
      ))}
      <Combos />
    </section>
  );
}

// Services clients often take together; each opens the contact page.
const COMBOS = [
  { title: "Launch kit", text: "Website + logo + Google profile" },
  { title: "Sell online", text: "Online store + Meta ads" },
  { title: "Get seen", text: "Social media + reels editing" },
  { title: "Grow faster", text: "SEO + Google ads + AI chatbot" },
];

function Combos() {
  return (
    <div className="container-x pt-16 sm:pt-24">
      <div className="relative grid gap-8 overflow-hidden rounded-[32px] bg-ink p-8 text-white sm:p-10 lg:grid-cols-[1fr_1.4fr]">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-28 h-[320px] w-[520px] rounded-full bg-lav-600/50 blur-[110px]" />
        <div className="relative">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-lav-300">Popular combos</p>
          <h2 className="h-display mt-3 text-3xl sm:text-4xl">One team for the whole job.</h2>
          <p className="mt-3 max-w-md leading-relaxed text-white/60">Most clients pick two or three services together. You get one plan, one invoice and one point of contact.</p>
          <Link href="/contact" className="btn-light mt-6">Plan my combo <ArrowUpRight size={17} /></Link>
        </div>
        <ul className="relative grid gap-3 sm:grid-cols-2">
          {COMBOS.map((c) => (
            <li key={c.title}>
              <Link href="/contact" className="block h-full rounded-[18px] border border-white/10 bg-white/[0.05] p-5 transition hover:border-lav-300/50 hover:bg-white/[0.08]">
                <p className="font-semibold">{c.title}</p>
                <p className="mt-1 text-sm text-white/60">{c.text}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Card({ s, wide, span, delay }: { s: Service; wide: boolean; span: string; delay: number }) {
  const href = `/services/${serviceSlug(s)}`;
  return (
    <motion.article
      id={s.id}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease, delay }}
      className={`group flex scroll-mt-28 flex-col rounded-[28px] border border-line bg-white p-3 transition hover:border-lav-300 hover:shadow-[0_24px_60px_-30px_rgba(87,69,181,0.45)] ${span}`}
    >
      <Link href={href} aria-label={s.title} className={`svc-stage relative block overflow-hidden rounded-[22px] bg-ink bg-[radial-gradient(80%_90%_at_50%_15%,rgba(110,89,217,0.42),transparent)] text-white ${wide ? "h-[230px] sm:h-[290px]" : "h-[230px]"}`}>
        <span aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:18px_18px]" />
        {s.badge && <span className="absolute left-4 top-4 z-10 rounded-full bg-[#f0abfc] px-2.5 py-0.5 text-[11px] font-bold text-[#3b0a45]">{s.badge}</span>}
        <span aria-hidden className={`absolute left-1/2 top-1/2 h-[124px] w-[260px] -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 group-hover:scale-[1.04] ${wide ? "scale-[1.45] sm:scale-[1.75]" : "scale-[1.45]"}`}>
          <span className="absolute inset-0 origin-center">
            <Stage kind={s.anim || s.id} badge={false} />
          </span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col px-3 pb-2 pt-5">
        <h3 className="h-display text-2xl">{s.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.short}</p>
        {s.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {s.tags.map((t) => <li key={t} className="rounded-full bg-mist px-3 py-1 text-[12.5px] text-muted">{t}</li>)}
          </ul>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-6">
          <Link href={href} className="text-sm font-semibold hover:text-lav-700">See details</Link>
          <div className="flex items-center gap-2">
            <Link href="/contact" className="rounded-full border border-line px-3.5 py-2 text-[13px] font-semibold transition hover:border-ink">Get a quote</Link>
            <Link href={href} aria-label={`${s.title} details`} className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white transition group-hover:bg-lav-600"><ArrowUpRight size={16} /></Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
