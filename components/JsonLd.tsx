import { serviceSlug, type SiteContent } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

const abs = (u: string) => (u.startsWith("http") ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`);

// Structured data so Google understands the business, its services and the FAQ.
// Pass faq={false} when the FAQ block isn't shown on the page (Google wants FAQ markup to match visible content).
export default function JsonLd({ content, faq: withFaq = true }: { content: SiteContent; faq?: boolean }) {
  const c = content.contact;
  const business = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#business`,
    name: content.brand.name,
    description: content.seo.metaDescription,
    url: SITE_URL,
    ...(content.brand.logo?.trim() ? { logo: abs(content.brand.logo.trim()) } : {}),
    image: `${SITE_URL}/og-image.jpg`,
    telephone: `+91${c.phone}`,
    email: c.email,
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "UPI, bank transfer, card",
    knowsAbout: [...content.services.map((s) => s.title), ...(content.seo.keywords ?? []).slice(0, 12)],
    contactPoint: [{
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: `+91${c.phone}`,
      email: c.email,
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    }],
    address: { "@type": "PostalAddress", addressLocality: "Jaipur", addressRegion: "Rajasthan", addressCountry: "IN" },
    areaServed: [{ "@type": "Country", name: "India" }, ...(content.seo.areas ?? []).slice(0, 20).map((name) => ({ "@type": "City", name }))],
    sameAs: [c.instagram, c.linkedin, c.youtube].filter(Boolean),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: content.services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.title, description: s.description, areaServed: "India", url: `${SITE_URL}/services/${serviceSlug(s)}` },
      })),
    },
  };
  const website = { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: content.brand.name, alternateName: ["Spinex", "Spinex IT"], inLanguage: "en-IN", publisher: { "@id": `${SITE_URL}/#business` } };
  // Main menu, so search engines see which pages matter most (helps Google pick sitelinks).
  const nav = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Main menu",
    itemListElement: [
      ["Our Services", "/services"], ["Our Work", "/work"], ["About Us", "/about"], ["Contact Us", "/contact"],
      ["Book a Free Call", "/book"], ["Blog", "/blog"], ["Internship", "/internship"], ["Careers", "/careers"],
    ].map(([name, path], i) => ({ "@type": "SiteNavigationElement", position: i + 1, name, url: `${SITE_URL}${path}` })),
  };
  const faq = withFaq && content.chatbot.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: content.chatbot.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }
    : null;

  const data = [business, website, nav, faq].filter(Boolean);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

// Page type plus the "Home › Page" trail, for the main pages (About, Contact, Services, Work, Careers, Internship).
// `items` lists things shown on the page (e.g. services) so answer engines can read the list.
export function PageJsonLd({ type = "WebPage", name, path, description, items }: {
  type?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
  name: string; path: string; description?: string; items?: { name: string; path: string; description?: string }[];
}) {
  const page = {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${SITE_URL}${path}#page`,
    url: `${SITE_URL}${path}`,
    name,
    ...(description ? { description } : {}),
    inLanguage: "en-IN",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#business` },
    ...(items?.length ? { mainEntity: { "@type": "ItemList", itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, url: `${SITE_URL}${x.path}`, ...(x.description ? { description: x.description } : {}) })) } } : {}),
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${path}` },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([page, crumbs]).replace(/</g, "\\u003c") }} />;
}
