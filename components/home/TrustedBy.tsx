"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useContent } from "../ContentProvider";
import { sized } from "@/lib/img";

export const MIN_CLIENTS = 1;

// "Trusted by" strip under the hero: client logos (or names when there is no logo) and an
// optional Google rating line. Both are switched on in Admin → Trusted by; off by default.
export default function TrustedBy() {
  const { content } = useContent();
  // Phones fit 3 logos in one line; with more, the line scrolls by itself instead of stacking down the page.
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const pick = () => setPhone(mq.matches);
    pick();
    mq.addEventListener("change", pick);
    return () => mq.removeEventListener("change", pick);
  }, []);
  const t = content.trusted;
  if (!t) return null;
  const items = (Array.isArray(t.items) ? t.items : []).filter((x) => x && (String(x.name || "").trim() || String(x.logo || "").trim()));
  // Shows as soon as the strip is switched on and has at least one client.
  const showLogos = !!t.show && items.length >= MIN_CLIENTS;
  const rating = String(t.rating || "").trim();
  const showRating = !!t.ratingShow && rating !== "";
  if (!showLogos && !showRating) return null;

  // A few logos sit still and centred under the title; with more (over 3 on phones, 5 on bigger
  // screens) they scroll slowly in one line. The second half of the row makes the loop seamless.
  const moving = items.length > (phone ? 3 : 5);
  const row = moving ? [...items, ...items] : items;

  return (
    <section className="overflow-x-clip bg-white pt-12 sm:pt-16" aria-label={t.title || "Our clients"} data-trusted>
      <div className="container-x">
        {showLogos && t.title && <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted sm:text-[13px]">{t.title}</p>}
        {showLogos && (
          <div className={`mt-5 sm:mt-6 ${moving ? "relative left-1/2 w-screen -translate-x-1/2 overflow-hidden" : ""}`}>
            <ul className={moving ? "flex w-max animate-marquee items-center gap-12 hover:[animation-play-state:paused] sm:gap-16" : "flex flex-wrap items-center justify-center gap-x-10 gap-y-5 sm:gap-x-16"}>
              {row.map((c, i) => (
                <li key={`${c.id}-${i}`} aria-hidden={moving && i >= items.length ? true : undefined}>
                  <Logo name={String(c.name || "")} logo={String(c.logo || "")} url={String(c.url || "")} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {showRating && <Rating rating={rating} count={String(t.reviewCount || "").trim()} source={String(t.ratingSource || "Google").trim() || "Google"} url={String(t.reviewUrl || "")} spaced={showLogos} />}
        {/* Thin line between the client logos and the tools strip below. */}
        <div aria-hidden className="mx-auto mt-10 max-w-[1240px] border-t border-line sm:mt-11" />
      </div>
    </section>
  );
}

function Logo({ name, logo, url }: { name: string; logo: string; url: string }) {
  // Logos share one small height so wide and square logos look balanced; a name without a logo is set
  // in small type at the same height.
  const inner = (
    <span className="flex h-9 max-w-[120px] items-center justify-center sm:h-11 sm:max-w-[170px]">
      {logo ? (
        <img src={sized(logo, 320)} alt={name || "Client logo"} loading="lazy" className="h-full w-auto max-w-full object-contain transition duration-300 group-hover:scale-105" />
      ) : (
        <span className="line-clamp-2 text-center font-display text-sm font-semibold leading-tight tracking-tight text-ink transition sm:text-base">{name}</span>
      )}
    </span>
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
