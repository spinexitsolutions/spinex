import { cityPath, citySlug, defaultFooter, serviceSlug, type FooterSettings, type SiteContent } from "./content";

export type FooterItem = { key: string; label: string; href: string; newTab?: boolean };

// The footer settings with every field filled in.
export function footerSettings(content: SiteContent): Required<FooterSettings> {
  const ft = { ...defaultFooter, ...(content.integrations?.footer ?? {}) };
  return {
    ...ft,
    productsCount: ft.productsCount ?? 3,
    titles: { ...defaultFooter.titles!, ...(ft.titles ?? {}) },
    hide: ft.hide ?? [],
    extra: ft.extra ?? [],
    copyright: ft.copyright ?? "",
  } as Required<FooterSettings>;
}

// Every link the footer can show, before hiding. The admin uses the same list for its on/off switches.
export function footerLinks(content: SiteContent, showProductsColumn: boolean) {
  const ft = footerSettings(content);
  const extra = (col: "services" | "company" | "legal") =>
    ft.extra.filter((x) => x.column === col && x.label.trim() && x.href.trim()).map((x) => ({ key: `extra:${x.id}`, label: x.label, href: x.href, newTab: /^https?:/.test(x.href) }));
  const services: FooterItem[] = [
    ...content.services.map((s) => ({ key: `service:${s.id}`, label: s.title, href: `/services/${serviceSlug(s)}` })),
    ...extra("services"),
  ];
  const company: FooterItem[] = [
    { key: "company:about", label: "About", href: "/about" },
    ...(content.products.length && !showProductsColumn ? [{ key: "company:products", label: "Our products", href: "/products" }] : []),
    { key: "company:work", label: "Our work", href: "/work" },
    { key: "company:blog", label: "Blog", href: "/blog" },
    { key: "company:careers", label: "Careers", href: "/careers" },
    { key: "company:internship", label: "Internship", href: "/internship" },
    ...(content.profile?.public ? [{ key: "company:profile", label: "Company profile (PDF)", href: "/company-profile" }] : []),
    { key: "company:verify", label: "Verify certificate", href: "/verify" },
    ...(content.cities ?? []).filter((x) => x.show).map((x) => ({ key: `city:${citySlug(x)}`, label: `Website development in ${x.city}`, href: cityPath(x) })),
    { key: "company:contact", label: "Contact", href: "/contact" },
    { key: "company:portal", label: "Client login", href: "/portal/login" },
    ...extra("company"),
  ];
  const legal: FooterItem[] = [
    { key: "legal:privacy", label: "Privacy Policy", href: "/privacy" },
    { key: "legal:terms", label: "Terms of Service", href: "/terms" },
    { key: "legal:refund", label: "Refund Policy", href: "/refund" },
    ...extra("legal"),
  ];
  return { services, company, legal };
}

// Things in the footer other than links that can be switched off.
export const FOOTER_PARTS = [
  { key: "info:tagline", label: "Short line under the logo" },
  { key: "info:email", label: "Email address" },
  { key: "info:phone", label: "Phone number" },
  { key: "info:social", label: "Instagram, LinkedIn and YouTube buttons" },
  { key: "col:services", label: "Services column" },
  { key: "col:company", label: "Company column" },
  { key: "legal:cookie", label: "Cookie settings link (only when the cookie banner is on)" },
  { key: "info:top", label: "Back to top button" },
] as const;
