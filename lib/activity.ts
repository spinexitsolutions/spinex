// Server only. "Who changed what": a short record of every important change in the admin panel.
// Kept for one year, then removed automatically. Writing never throws, so it can't break the action itself.
import { getDb, hasDb } from "./db";
import { clientIp } from "./antispam";

export type Activity = {
  id: string;
  at: string;
  uid: string;
  name: string;
  role: string;
  area: string; // "Website content", "Leads", "Invoices", "Login"…
  action: string; // short sentence, e.g. "Changed Services, Projects"
  target: string; // what it was about, e.g. a lead's name or an invoice number
  ip: string;
};

type Who = { uid?: string; name?: string; role?: string; email?: string } | null | undefined;

let indexed = false;
const col = async () => {
  const c = (await getDb()).collection("activity");
  if (!indexed) {
    indexed = true;
    await c.createIndex({ at: 1 }, { expireAfterSeconds: 365 * 86400 }).catch(() => undefined);
  }
  return c;
};

export async function logActivity(who: Who, area: string, action: string, target = "", req?: Request) {
  if (!hasDb()) return;
  try {
    const ip = req ? clientIp(req).slice(0, 60) : "";
    await (await col()).insertOne({
      at: new Date(),
      uid: String(who?.uid ?? ""),
      name: String(who?.name || who?.email || "Unknown").slice(0, 80),
      role: String(who?.role ?? ""),
      area: area.slice(0, 40),
      action: action.slice(0, 300),
      target: target.slice(0, 160),
      ip,
    });
  } catch (e) {
    console.error("Activity log write failed:", e);
  }
}

export async function listActivity(opts: { area?: string; uid?: string; before?: string; limit?: number }) {
  const q: Record<string, unknown> = {};
  if (opts.area) q.area = opts.area;
  if (opts.uid) q.uid = opts.uid;
  if (opts.before && !Number.isNaN(Date.parse(opts.before))) q.at = { $lt: new Date(opts.before) };
  const docs = await (await col()).find(q).sort({ at: -1 }).limit(Math.min(200, opts.limit ?? 100)).toArray();
  return docs.map((d) => ({
    id: String(d._id), at: new Date(d.at).toISOString(), uid: String(d.uid ?? ""), name: String(d.name ?? ""), role: String(d.role ?? ""),
    area: String(d.area ?? ""), action: String(d.action ?? ""), target: String(d.target ?? ""), ip: String(d.ip ?? ""),
  })) as Activity[];
}

// Names of the website content parts, for "Changed Services, Projects".
const PART_NAMES: Record<string, string> = {
  theme: "Colour theme", planner: "Project planner", brand: "Brand", hero: "Hero", sections: "Section headings", process: "Process steps",
  goals: "Goal picker", pages: "Page headers", homeLayout: "Home page layout", seo: "SEO", about: "About", stats: "Stats",
  services: "Services", projects: "Projects", products: "Products", industries: "Industries", testimonials: "Testimonials",
  trusted: "Trusted by", leadReplies: "Auto-reply and alerts", showreel: "Showreel", banners: "Page banners", certificate: "Certificate settings",
  careers: "Careers", integrations: "WhatsApp and analytics", internship: "Internship", contact: "Contact details", chatbot: "Chatbot",
  removedServices: "Services",
};

export function contentChanges(before: Record<string, unknown> | null | undefined, after: Record<string, unknown>) {
  const parts = new Set<string>();
  for (const k of Object.keys(after)) {
    if (k === "contentVersion") continue;
    if (JSON.stringify(before?.[k] ?? null) !== JSON.stringify(after[k] ?? null)) parts.add(PART_NAMES[k] ?? k);
  }
  return [...parts];
}
