import { cityPath, productSlug, projectSlug, serviceSlug, type SiteContent } from "./content";
import type { Post } from "./posts";
import { SITE_URL } from "./site";

// Search and AI crawlers named in robots.txt. They are allowed on the public pages, so the business can be
// found and quoted by Google, Bing, ChatGPT, Claude, Perplexity, Gemini and Apple answers.
export const AI_CRAWLERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot", "Applebot-Extended",
  "Bingbot", "DuckAssistBot", "meta-externalagent", "CCBot",
];

// Private areas: client documents, staff, admin, one-time links. Never crawled.
export const PRIVATE_PATHS = ["/admin", "/api/", "/portal", "/staff", "/b/", "/d/", "/f/", "/l/", "/p/", "/r/", "/stop-emails/", "/letter-guide", "/letter-samples", "/blog/preview"];

// "Question" line, "Answer" line(s), blank line between pairs.
export function parseFaqs(text: string) {
  return (text || "")
    .split(/\n\s*\n/)
    .map((block) => block.trim().split("\n"))
    .filter((lines) => lines.length >= 2 && lines[0].trim())
    .map(([q, ...a]) => ({ q: q.trim(), a: a.join(" ").trim() }));
}

const url = (path: string) => `${SITE_URL}${path}`;
const line = (s: string) => s.replace(/\s+/g, " ").trim();

// llms.txt: a short, plain guide to the website for AI assistants (llmstxt.org). `full` adds service details and FAQs.
export function llmsText(c: SiteContent, posts: Post[], full = false): string {
  const out: string[] = [];
  const name = c.brand.name || "Spinex IT Solutions";
  out.push(`# ${name}`, "");
  out.push(`> ${line(c.seo.metaDescription || c.brand.tagline)}`, "");
  const facts = [
    `${name} is an IT and digital marketing company based in ${c.contact.location || "Jaipur, Rajasthan, India"}, working with businesses across India.`,
    c.contact.phone ? `Phone / WhatsApp: +91 ${c.contact.phone}` : "",
    c.contact.email ? `Email: ${c.contact.email}` : "",
    `Website: ${SITE_URL}`,
    c.seo.areas?.length ? `Cities served: ${c.seo.areas.join(", ")}, and online across India.` : "",
    `Free first call: ${url("/book")}`,
  ].filter(Boolean);
  out.push(...facts.map((f) => `- ${f}`), "");

  out.push("## Services", "");
  for (const s of c.services) {
    out.push(`- [${s.title}](${url(`/services/${serviceSlug(s)}`)}): ${line(s.short || s.description)}`);
    if (full) {
      if (s.description) out.push(`  ${line(s.description)}`);
      if (s.features?.length) out.push(`  Includes: ${s.features.join("; ")}.`);
      for (const f of parseFaqs(s.faqs)) out.push(`  Q: ${f.q} A: ${line(f.a)}`);
    }
  }
  out.push("");

  if (c.products.length) {
    out.push("## Products (software we built)", "");
    for (const p of c.products) out.push(`- [${p.name}](${url(`/products/${productSlug(p)}`)}): ${line(p.tagline || p.description)}`);
    out.push("");
  }

  const cities = (c.cities ?? []).filter((x) => x.show);
  if (cities.length) {
    out.push("## Locations", "");
    for (const x of cities) out.push(`- [Website development in ${x.city}](${url(cityPath(x))}): ${line(x.metaDescription || x.intro)}`);
    out.push("");
  }

  const work = c.projects.filter((p) => !p.hidePage);
  if (work.length) {
    out.push("## Work", "");
    for (const p of work.slice(0, 30)) out.push(`- [${p.title}](${url(`/work/${projectSlug(p)}`)}): ${line(`${p.category}. ${p.summary}`)}`);
    out.push("");
  }

  out.push("## Pages", "");
  out.push(
    `- [About](${url("/about")}): who we are and how we work`,
    `- [Contact](${url("/contact")}): enquiry form, phone, WhatsApp and email`,
    `- [Book a call](${url("/book")}): pick a time for a free video call`,
    `- [Internship](${url("/internship")}): internships in web development, design, video and marketing`,
    `- [Careers](${url("/careers")}): open jobs`,
    `- [Blog](${url("/blog")}): guides on websites, online stores, SEO and social media`,
    "",
  );

  const faqs = c.chatbot.faqs.filter((f) => f.q && f.a);
  if (full && faqs.length) {
    out.push("## Frequently asked questions", "");
    for (const f of faqs) out.push(`### ${line(f.q)}`, line(f.a), "");
  }
  if (full && c.seo.text) out.push("## About the company", "", c.seo.text.trim(), "");

  if (posts.length) {
    out.push(full ? "## Blog posts" : "## Optional", "");
    for (const p of posts.slice(0, full ? 200 : 25)) out.push(`- [${p.title}](${url(`/blog/${p.slug}`)}): ${line(p.seoDescription || p.excerpt)}`);
    out.push("");
  }
  if (!full) out.push(`Full details for AI assistants: ${url("/llms-full.txt")}`, "");
  return out.join("\n");
}

// IndexNow: tells Bing (which also feeds ChatGPT search and Copilot), Yandex and others that pages changed.
// The key is served at /indexnow.txt. Never blocks or throws; does nothing on a local address.
export async function pingIndexNow(key: string, paths: string[]) {
  try {
    if (!key || !paths.length || /localhost|127\.0\.0\.1|\.local\b|\.test\b/.test(SITE_URL)) return false;
    const host = new URL(SITE_URL).host;
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: url("/indexnow.txt"), urlList: [...new Set(paths)].slice(0, 1000).map(url) }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Key for IndexNow, made from AUTH_SECRET so nothing has to be stored. It is public by design
// (served at /indexnow.txt) and reveals nothing about the secret.
export async function indexNowKey(): Promise<string> {
  const s = process.env.AUTH_SECRET || "";
  if (s.length < 16) return "";
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(`indexnow:${s}`).digest("hex").slice(0, 32);
}

// Tell search engines about changed pages, at most once every 10 minutes for whole-site changes.
let lastSitePing = 0;
export async function announce(paths: string[], c: Pick<SiteContent, "seo">, wholeSite = false) {
  if (c.seo?.indexNow === false) return false;
  if (wholeSite) {
    if (Date.now() - lastSitePing < 10 * 60e3) return false;
    lastSitePing = Date.now();
  }
  return pingIndexNow(await indexNowKey(), paths);
}

// Public pages, for announcing a whole-site change.
export function sitePaths(c: SiteContent): string[] {
  return [
    "/", "/services", "/work", "/about", "/contact", "/book", "/blog", "/internship", "/careers",
    ...c.services.map((s) => `/services/${serviceSlug(s)}`),
    ...(c.products.length ? ["/products", ...c.products.map((p) => `/products/${productSlug(p)}`)] : []),
    ...(c.cities ?? []).filter((x) => x.show).map((x) => cityPath(x)),
    ...c.projects.filter((p) => !p.hidePage).map((p) => `/work/${projectSlug(p)}`),
  ];
}
