import type { SiteContent } from "./content";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/g, " ");
const tokens = (s: string) => norm(s).split(/\s+/).filter(Boolean);

// True when the keyword (one word or a phrase) appears as whole words in the question.
// The last word may take a plural "s"/"es" ("day" matches "days"), but "hi" never matches "high" or "Delhi".
function makeMatcher(question: string) {
  const words = tokens(question);
  return (keyword: string) => {
    const p = tokens(keyword);
    if (!p.length) return false;
    return words.some((_, i) =>
      p.every((w, j) => {
        const t = words[i + j];
        return t === w || (j === p.length - 1 && (t === `${w}s` || t === `${w}es`));
      }),
    );
  };
}

// Offline answer engine: matches the question against FAQs, services and contact intents.
export function localAnswer(question: string, c: SiteContent): string {
  const q = ` ${norm(question)} `;
  const match = makeMatcher(question);
  const has = (...words: string[]) => words.some(match);

  if (has("hi", "hello", "hey", "namaste", "hii"))
    return `Hello! Tell me what you'd like to build: a website, an online store, social media, ads or video. I'll explain how we'd approach it.`;

  if (has("contact", "call", "phone", "number", "whatsapp", "email", "mail", "baat"))
    return `You can reach us on +91 ${c.contact.phone} (call or WhatsApp) or at ${c.contact.email}. We're in ${c.contact.location}.`;

  let best: { score: number; answer: string } = { score: 0, answer: "" };
  for (const f of c.chatbot.faqs) {
    const score = f.keywords.reduce((n, k) => n + (match(k) ? 2 : 0), 0);
    if (score > best.score) best = { score, answer: f.a };
  }
  for (const s of c.services) {
    const terms = [s.title, ...s.tags].map((t) => norm(t).trim()).flatMap((t) => t.split(/\s+/)).filter((t) => t.length > 3);
    const score = terms.reduce((n, t) => n + (q.includes(t) ? 1 : 0), 0);
    if (score > best.score)
      best = { score, answer: `${s.title}: ${s.description} Want a quote? Share a few details and we'll reply within a day.` };
  }
  if (best.score > 0) return best.answer;

  if (has("service", "kya karte", "offer", "what do you"))
    return `We offer ${c.services.map((s) => s.title.toLowerCase()).join(", ")}. Which one are you interested in?`;

  return `I don't have a ready answer for that. Our team can help directly on WhatsApp (+91 ${c.contact.phone}) or by email at ${c.contact.email}.`;
}

export function knowledgeText(c: SiteContent): string {
  return [
    `Company: ${c.brand.name}, ${c.contact.location}. ${c.about.body}`,
    `Services:\n${c.services.map((s) => `- ${s.title}: ${s.description}`).join("\n")}`,
    `FAQs:\n${c.chatbot.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")}`,
    `Contact: phone/WhatsApp +91 ${c.contact.phone}, email ${c.contact.email}.`,
  ].join("\n\n");
}
