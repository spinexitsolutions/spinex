import { type SiteContent } from "./content";

// Server-side clean-up of content sent from the admin panel, before it is saved.

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

// Keeps http(s) links and site paths like "/work". A bare domain ("example.com/page") gets https:// added.
// Anything else (javascript:, data:, vbscript:, "//host" …) becomes "".
export function safeUrl(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  if (/^https?:\/\/[^\s]/i.test(s)) return s;
  if (s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\")) return s;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]|$)/i.test(s)) return `https://${s}`;
  return "";
}

// Makes `value` match the shape of `def`: arrays stay arrays, objects stay objects, text stays text.
// Keys with the wrong type are dropped (undefined), so the built-in default is used for them instead.
function shape(def: unknown, value: unknown): unknown {
  if (Array.isArray(def)) {
    if (!Array.isArray(value)) return undefined;
    const first = def[0];
    if (isObj(first)) return value.filter(isObj);
    if (typeof first === "string") return value.filter((x) => typeof x === "string");
    // No default item to compare with (an empty list): a list of objects keeps only objects.
    if (first === undefined && value.some(isObj)) return value.filter(isObj);
    return value.filter((x) => x !== null && x !== undefined);
  }
  if (isObj(def)) {
    if (!isObj(value)) return undefined;
    const out: Record<string, unknown> = { ...value };
    for (const k of Object.keys(def)) {
      if (!(k in value)) continue;
      const v = shape(def[k], value[k]);
      if (v === undefined) delete out[k];
      else out[k] = v;
    }
    return out;
  }
  return typeof value === typeof def ? value : undefined;
}

// Keeps only known top-level sections, each with the same kind of value as the defaults.
export function cleanContentInput(body: Record<string, unknown>, defaults: SiteContent): Partial<SiteContent> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(defaults) as (keyof SiteContent)[]) {
    if (!(key in body) || body[key] === null || body[key] === undefined) continue;
    const v = key === "removedServices" ? (Array.isArray(body[key]) ? (body[key] as unknown[]).filter((x) => typeof x === "string") : undefined) : shape(defaults[key], body[key]);
    if (v !== undefined) out[key] = v;
  }
  return out as Partial<SiteContent>;
}

// Links that end up in href / iframe src only keep safe values.
export function sanitizeUrls(c: SiteContent): SiteContent {
  return {
    ...c,
    projects: c.projects.map((p) => ({ ...p, url: safeUrl(p.url), ...(p.video !== undefined ? { video: safeUrl(p.video) } : {}) })),
    products: c.products.map((p) => ({ ...p, demoUrl: safeUrl(p.demoUrl), videoUrl: safeUrl(p.videoUrl) })),
    showreel: { ...c.showreel, video: safeUrl(c.showreel.video) },
    contact: { ...c.contact, instagram: safeUrl(c.contact.instagram), linkedin: safeUrl(c.contact.linkedin), youtube: safeUrl(c.contact.youtube) },
  };
}

// Certificate settings sent from the admin panel. Returns null when the shape is wrong.
export function cleanCertificate(v: unknown): SiteContent["certificate"] | null {
  if (!isObj(v)) return null;
  const { title, body, verifyUrl, signers } = v;
  if (typeof title !== "string" || typeof body !== "string" || typeof verifyUrl !== "string" || !Array.isArray(signers) || signers.length > 3) return null;
  const list: SiteContent["certificate"]["signers"] = [];
  for (const s of signers) {
    if (!isObj(s)) return null;
    const { id, name, title: role, image } = s;
    if ([id, name, role, image].some((x) => typeof x !== "string")) return null;
    list.push({ id: String(id).slice(0, 60), name: String(name).slice(0, 120), title: String(role).slice(0, 120), image: String(image).slice(0, 2000) });
  }
  return { title: title.slice(0, 200), body: body.slice(0, 2000), verifyUrl: verifyUrl.slice(0, 300), signers: list };
}
