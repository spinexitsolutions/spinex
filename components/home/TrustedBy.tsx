"use client";

import { Star } from "lucide-react";
import { useContent } from "../ContentProvider";

// "Trusted by" strip under the hero: client logos (or names when there is no logo) and an
// optional Google rating line. Both are switched on in Admin → Trusted by; off by default.
export default function TrustedBy() {
  const { content } = useContent();
  const t = content.trusted;
  if (!t) return null;
  const items = (Array.isArray(t.items) ? t.items : []).filter((x) => x && (String(x.name || "").trim() || String(x.logo || "").trim()));
  const showLogos = !!t.show && items.length > 0;
  const rating = String(t.rating || "").trim();
  const showRating = !!t.ratingShow && rating !== "";
  if (!showLogos && !showRating) return null;

  // Many logos scroll slowly; a few stay still and centred.
  const moving = items.length > 6;
  const row = moving ? [...items, ...items] : items;

  return (
    <section className="border-b border-line bg-white py-12 sm:py-14" aria-label={t.title || "Our clients"}>
      <div className="container-x">
        {showLogos && t.title && <p className="text-center text-sm font-semibold uppercase tracking-[0.14em] text-muted">{t.title}</p>}
        {showLogos && (
          <div className={`relative mt-8 ${moving ? "overflow-hidden" : ""}`}>
            <ul className={moving ? "flex w-max animate-marquee items-center gap-14 hover:[animation-play-state:paused]" : "flex flex-wrap items-center justify-center gap-x-14 gap-y-8"}>
              {row.map((c, i) => (
                <li key={`${c.id}-${i}`} aria-hidden={moving && i >= items.length ? true : undefined}>
                  <Logo name={String(c.name || "")} logo={String(c.logo || "")} url={String(c.url || "")} />
                </li>
              ))}
            </ul>
            {moving && (
              <>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white" />
              </>
            )}
          </div>
        )}
        {showRating && <Rating rating={rating} count={String(t.reviewCount || "").trim()} source={String(t.ratingSource || "Google").trim() || "Google"} url={String(t.reviewUrl || "")} spaced={showLogos} />}
      </div>
    </section>
  );
}

function Logo({ name, logo, url }: { name: string; logo: string; url: string }) {
  const inner = logo ? (
    <img src={logo} alt={name || "Client logo"} loading="lazy" className="h-9 w-auto max-w-[150px] object-contain opacity-60 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0 sm:h-10" />
  ) : (
    <span className="whitespace-nowrap font-display text-xl font-semibold tracking-tight text-ink/45 transition group-hover:text-ink">{name}</span>
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="group block" title={name}>{inner}</a>
  ) : (
    <span className="group block" title={name}>{inner}</span>
  );
}

function Rating({ rating, count, source, url, spaced }: { rating: string; count: string; source: string; url: string; spaced: boolean }) {
  const n = Math.max(0, Math.min(5, Number(rating) || 0));
  const body = (
    <>
      <span className="flex gap-0.5 text-amber-400" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={16} className={i < Math.round(n) ? "fill-current" : "opacity-30"} />
        ))}
      </span>
      <span className="font-semibold text-ink">{rating}</span>
      <span className="text-muted">on {source}{count ? ` · ${count} reviews` : ""}</span>
    </>
  );
  const cls = "inline-flex items-center gap-2.5 rounded-full border border-line bg-mist px-5 py-2.5 text-sm";
  return (
    <div className={`flex justify-center ${spaced ? "mt-10" : ""}`}>
      {url ? <a href={url} target="_blank" rel="noopener noreferrer" className={`${cls} transition hover:border-lav-300`}>{body}</a> : <p className={cls}>{body}</p>}
    </div>
  );
}
