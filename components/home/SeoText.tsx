import Link from "next/link";
import {
  ArrowUpRight, MapPin, Globe, ShoppingBag, TrendingUp, Heart, Clapperboard, PenTool, Smartphone, Megaphone, Sparkles,
  Video, MessageCircle, BadgeCheck, type LucideIcon,
} from "lucide-react";
import { serviceSlug, type SiteContent } from "@/lib/content";
import { Reveal } from "../Reveal";

const icons: Record<string, LucideIcon> = {
  web: Globe, ecommerce: ShoppingBag, marketing: TrendingUp, social: Heart, video: Clapperboard,
  design: PenTool, ondemand: Smartphone, promotion: Megaphone,
};

const remote = [
  { Icon: Video, title: "Video calls", text: "Plan and review together, wherever you are." },
  { Icon: MessageCircle, title: "WhatsApp updates", text: "Progress and previews shared as we go." },
  { Icon: BadgeCheck, title: "Same team, same quality", text: "Jaipur or anywhere else in India." },
];

// Server-rendered "about us for Google" block: who we are, every service with a link
// to its page, and the cities we serve. Text is edited in Admin → SEO.
export default function SeoText({ content }: { content: SiteContent }) {
  const seo = content.seo;
  const [lead, ...rest] = seo.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const stats = content.stats.slice(0, 3);

  return (
    <section className="relative overflow-hidden border-t border-line bg-white py-24 sm:py-32" aria-labelledby="seo-heading">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-lav-100/70 blur-3xl" />

      <div className="container-x relative">
        {/* Intro */}
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-16">
          <Reveal>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted">
              <MapPin size={15} className="text-lav-600" /> Based in Jaipur · Working across India
            </p>
            <h2 id="seo-heading" className="h-display text-4xl sm:text-5xl lg:text-6xl">{seo.heading}</h2>
          </Reveal>
          {lead && (
            <Reveal delay={0.1}>
              <p className="text-lg leading-relaxed text-ink/75">{lead}</p>
            </Reveal>
          )}
        </div>

        {/* Services */}
        <nav aria-label="Our services" className="mt-14">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.services.map((s, i) => {
              const Icon = icons[s.id] ?? Sparkles;
              return (
                <li key={s.id}>
                  <Reveal delay={(i % 4) * 0.06} className="h-full">
                    <Link
                      href={`/services/${serviceSlug(s)}`}
                      className="group flex h-full flex-col rounded-[22px] border border-line bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-ink hover:shadow-[0_18px_40px_-24px_rgba(20,16,40,0.35)]"
                    >
                      <span className="flex items-center justify-between">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-lav-100 text-lav-700 transition-colors duration-300 group-hover:bg-ink group-hover:text-white">
                          <Icon size={20} />
                        </span>
                        <span className="font-display text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
                      </span>
                      <span className="mt-6 block font-display text-xl font-semibold tracking-tight">{s.title}</span>
                      <span className="mt-2 block flex-1 text-[15px] leading-relaxed text-muted">{s.short}</span>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink group-hover:text-lav-700">
                        Learn more <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* More about us + across India */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {rest.length > 0 && (
            <Reveal className="h-full">
              <div className="h-full rounded-[28px] bg-mist p-7 sm:p-10">
                <div className="space-y-5 text-[16px] leading-[1.8] text-ink/80">
                  {rest.map((p, i) => <p key={i}>{p}</p>)}
                </div>
                {stats.length > 0 && (
                  <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6">
                    {stats.map((st) => (
                      <div key={st.id}>
                        <dt className="sr-only">{st.label}</dt>
                        <dd className="font-display text-2xl font-semibold sm:text-3xl">{st.value}</dd>
                        <dd className="mt-1 text-xs text-muted sm:text-sm">{st.label}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </Reveal>
          )}

          <Reveal delay={0.1} className="h-full">
            <div className="relative h-full overflow-hidden rounded-[28px] bg-ink p-7 text-white sm:p-10">
              <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-lav-600/30 blur-3xl" />
              <h3 className="relative font-display text-2xl font-semibold tracking-tight sm:text-3xl">Wherever you are in India</h3>
              <p className="relative mt-2 text-white/60">Our team is in Jaipur. Our clients are all over the country.</p>

              <ul className="relative mt-6 grid gap-4">
                {remote.map(({ Icon, title, text }) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-lav-300"><Icon size={17} /></span>
                    <span>
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-sm text-white/60">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {seo.areas.length > 0 && (
                <div className="relative mt-8 border-t border-white/10 pt-6">
                  <p className="flex items-center gap-2 text-sm text-white/60"><MapPin size={15} className="text-lav-300" /> Cities we work with</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {seo.areas.map((a) => (
                      <li key={a} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/85">{a}</li>
                    ))}
                    <li className="rounded-full bg-lav-600 px-3 py-1.5 text-sm font-medium">+ all of India</li>
                  </ul>
                </div>
              )}

              <Link href="/contact" className="btn-light relative mt-8">Get a free quote <ArrowUpRight size={16} /></Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
