"use client";

import { useContent } from "../ContentProvider";
import { toolIcon, toolKey } from "@/lib/tool-icons";

// Tools strip under the client logos: logo chips on white that slowly scroll (pauses on hover).
// The list is in Admin → Home page → Tools; on/off in Home page → Sections.
export default function Marquee() {
  const { content } = useContent();
  const tools = content.sections.tools.filter((t) => t.trim());
  if (!tools.length) return null;
  const row = [...tools, ...tools];
  const title = content.sections.toolsTitle ?? "Tools and platforms we work with";
  return (
    <section aria-label={title || "Tools we use"} className="relative border-b border-line bg-white pb-10 pt-5 sm:pb-12 sm:pt-6" data-tools-strip>
      {title && <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted sm:text-xs">{title}</p>}
      {/* Moves the other way to the client logos above, so the two lines read as separate. */}
      <div className="mx-auto max-w-[1240px] overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)]">
      <div className="flex w-max animate-marquee gap-2.5 whitespace-nowrap [animation-direction:reverse] hover:[animation-play-state:paused] sm:gap-3">
        {row.map((t, i) => (
          <span key={i} aria-hidden={i >= tools.length || undefined} className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-2 pr-3.5 sm:gap-2.5 sm:py-2 sm:pl-2.5 sm:pr-4">
            <Logo name={t} />
            <span className="font-display text-sm font-semibold text-ink sm:text-[15px]">{t}</span>
          </span>
        ))}
      </div>
      </div>
    </section>
  );
}

function Logo({ name }: { name: string }) {
  const icon = toolIcon(name);
  if (icon) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 sm:h-[22px] sm:w-[22px]" aria-hidden>
        <path fill={icon.color} d={icon.path} />
      </svg>
    );
  }
  // WooCommerce and any tool without a stored logo: a small badge with its first letters.
  const woo = toolKey(name) === "woocommerce";
  return (
    <span aria-hidden className={`grid h-6 shrink-0 place-items-center rounded-md px-1 font-display text-[9px] font-bold text-white ${woo ? "bg-[#7F54B3]" : "w-6 bg-lav-600 text-[11px]"}`}>
      {woo ? "Woo" : name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}
