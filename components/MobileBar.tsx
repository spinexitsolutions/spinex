"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Phone } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { useContent } from "./ContentProvider";
import { track } from "@/lib/track";
import { defaultMobileBar } from "@/lib/content";

// Slim bar fixed to the bottom of the screen on phones: Call, WhatsApp and Get a quote.
// On/off and buttons in Admin → Integrations → Bottom bar on phones.
export default function MobileBar() {
  const { content } = useContent();
  const mb = { ...defaultMobileBar, ...(content.integrations?.mobileBar ?? {}) };
  const c = content.contact;
  const phone = String(c.phone || "").replace(/\D/g, "");
  const wa = String(c.whatsapp || "").replace(/\D/g, "");
  const items = [
    mb.call && phone ? { key: "call", label: "Call", href: `tel:+91${phone.slice(-10)}`, Icon: Phone, external: false } : null,
    mb.whatsapp && wa ? { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/${wa}?text=${encodeURIComponent(content.integrations?.whatsappText || "Hi Spinex!")}`, Icon: WhatsAppIcon, external: true } : null,
    mb.quote ? { key: "quote", label: mb.quoteLabel || "Get a quote", href: mb.quoteLink || "/contact", Icon: FileText, external: false } : null,
  ].filter(Boolean) as { key: string; label: string; href: string; Icon: React.ComponentType<{ size?: number }>; external: boolean }[];
  const on = mb.show && items.length > 0;

  // Hidden while the cookie banner or the phone menu is open.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    if (!on) {
      delete html.dataset.mobileBar;
      return;
    }
    html.dataset.mobileBar = "1";
    const read = () => setHidden(html.dataset.cookieOpen === "1" || html.dataset.menuOpen === "1");
    read();
    const mo = new MutationObserver(read);
    mo.observe(html, { attributes: true, attributeFilter: ["data-cookie-open", "data-menu-open"] });
    return () => {
      mo.disconnect();
      delete html.dataset.mobileBar;
    };
  }, [on]);
  if (!on) return null;

  return (
    <nav
      aria-label="Quick contact"
      data-mobile-bar
      className={`fixed inset-x-0 bottom-0 z-[55] border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgba(18,15,27,0.35)] transition-transform duration-300 md:hidden ${hidden ? "translate-y-full" : ""}`}
    >
      <ul className="grid h-16" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ key, label, href, Icon, external }) => {
          const cls = `flex h-full flex-col items-center justify-center gap-1 text-[12px] font-semibold ${key === "quote" ? "bg-ink text-white" : key === "whatsapp" ? "text-[#128C4B]" : "text-ink"}`;
          const onClick = () => track("contact", { method: key === "quote" ? "quote" : key, from: "mobile_bar" });
          return (
            <li key={key} className="border-r border-line last:border-r-0">
              {external || href.startsWith("tel:") ? (
                <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} onClick={onClick} className={cls}><Icon size={19} /> {label}</a>
              ) : (
                <Link href={href} onClick={onClick} className={cls}><Icon size={19} /> {label}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
