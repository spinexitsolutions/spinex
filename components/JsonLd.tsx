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
    address: { "@type": "PostalAddress", addressLocality: "Jaipur", addressRegion: "Rajasthan", addressCountry: "IN" },
    areaServed: { "@type": "Country", name: "India" },
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
  const website = { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: content.brand.name, publisher: { "@id": `${SITE_URL}/#business` } };
  const faq = withFaq && content.chatbot.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: content.chatbot.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }
    : null;

  const data = [business, website, faq].filter(Boolean);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
