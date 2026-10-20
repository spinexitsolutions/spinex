import { type SiteContent } from "./content";

// Server-side clean-up of content sent from the admin panel, before it is saved.

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

// Keeps http(s) links and site paths like "/work". A bare domain ("example.com/page") gets https:// added,
// and a bare file name ("showreel.mp4") becomes a site path ("/showreel.mp4").
// Anything else (javascript:, data:, vbscript:, "//host", text with spaces or control characters …) becomes "".
const FILE_EXT = /\.(mp4|webm|mov|m4v|ogg|ogv|mp3|wav|jpe?g|png|gif|webp|avif|svg|ico|pdf|txt|json|xml|html?)$/i;
export function safeUrl(v: unknown): string {
  const raw = typeof v === "string" ? v.trim() : "";
  if (!raw) return "";
  // Browsers strip tabs/newlines inside URLs ("/\t/evil.com" → "//evil.com"), so reject them outright.
  if (/[\u0000-\u001f\u007f-\u009f]/.test(raw)) return "";
  // Ordinary spaces (e.g. "Show reel.mp4") are kept by encoding them.
  const s = raw.replace(/ /g, "%20");
  if (/^https?:\/\/[^\s]/i.test(s)) return s;
  if (s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\")) return s;
  // A file name with no folder or scheme, e.g. "showreel.mp4" (not a domain like "example.com/x").
  if (/^[\w-]+(\.[\w-]+)*$/.test(s) && FILE_EXT.test(s)) return `/${s}`;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]|$)/i.test(s)) return `https://${s}`;
  return "";
}

// Makes `value` match the shape of `def`: arrays stay arrays, objects stay objects, text stays text.
// Keys with the wrong type are dropped (undefined), so the built-in default is used for them instead.
function shape(def: unknown, value: unknown): unknown {
  if (Array.isArray(def)) {
    if (!Array.isArray(value)) return undefined;
    const first = def[0];
    // Each item is checked field by field against the first default item, so e.g. a number as a
    // service title is dropped (and the default/blank is used) instead of crashing the pages.
    if (isObj(first)) return value.filter(isObj).map((item) => shape(first, item) as Record<string, unknown>);
    // Text lists: blank items (e.g. an empty line left in a "one per line" field) are removed.
    if (typeof first === "string") return value.filter((x) => typeof x === "string" && x.trim() !== "");
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
  if (typeof value === typeof def) return value;
  // A number or true/false where text is expected (e.g. a title of 5) is kept as text.
  if (typeof def === "string" && ((typeof value === "number" && Number.isFinite(value)) || typeof value === "boolean")) return String(value);
  return undefined;
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
