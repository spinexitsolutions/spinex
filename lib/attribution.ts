// Where a visitor came from (Google Ads, Instagram, Google search…), saved with their enquiry.
// Pure helpers are shared by the browser and the server; the browser part stores the visit in localStorage.

export type Touch = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  clickId: string; // "gclid", "fbclid", "msclkid"… (which kind, not the long value)
  referrer: string; // host only, e.g. "www.google.com"
  landingPage: string; // first page of that visit, e.g. "/services/seo?utm_source=…" (path only)
  at: string; // ISO time
};

export type LeadTrack = Touch & {
  channel: string; // e.g. "Google Ads"
  formPage: string; // page where the form was sent
  firstChannel: string; // how they found you the very first time
  firstAt: string;
};

export const TRACK_FIELDS = ["utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent", "clickId", "referrer", "landingPage", "at", "formPage", "firstChannel", "firstAt"] as const;

const has = (s: string, list: string[]) => list.some((x) => s === x || s.includes(x));

// Turns a visit into a simple label for the Leads screen.
export function channelOf(t: Partial<Touch> | null | undefined): string {
  if (!t) return "Direct";
  const src = (t.utmSource || "").toLowerCase().trim();
  const med = (t.utmMedium || "").toLowerCase().trim();
  const ref = (t.referrer || "").toLowerCase();
  const click = (t.clickId || "").toLowerCase();
  const paid = has(med, ["cpc", "ppc", "paid", "ads", "ad", "cpm", "sponsored"]);
  const meta = has(src, ["facebook", "instagram", "meta", "fb", "ig"]);

  if (click === "gclid" || click === "gbraid" || click === "wbraid" || (paid && src.includes("google"))) return "Google Ads";
  if (paid && meta) return "Meta Ads (Facebook / Instagram)";
  if (click === "msclkid" || (paid && src.includes("bing"))) return "Bing Ads";
  if (paid && src.includes("linkedin")) return "LinkedIn Ads";
  if (paid && src) return `${t.utmSource} (paid)`;

  if (src) {
    if (src.includes("instagram") || src === "ig") return "Instagram";
    if (src.includes("facebook") || src === "fb") return "Facebook";
    if (src.includes("whatsapp")) return "WhatsApp";
    if (src.includes("linkedin")) return "LinkedIn";
    if (src.includes("youtube")) return "YouTube";
    if (src.includes("google")) return med.includes("organic") || !med ? "Google search" : `Google (${t.utmMedium})`;
    if (src.includes("gmb") || src.includes("business")) return "Google Business Profile";
    if (has(src, ["email", "newsletter", "mail"])) return "Email";
    return t.utmSource || "Other";
  }
  if (ref) {
    if (/(^|\.)google\./.test(ref)) return "Google search";
    if (/(^|\.)bing\.com$/.test(ref)) return "Bing search";
    if (/(^|\.)instagram\.com$/.test(ref)) return "Instagram";
    if (/(^|\.)facebook\.com$|(^|\.)fb\.com$/.test(ref)) return "Facebook";
    if (/(^|\.)linkedin\.com$|lnkd\.in$/.test(ref)) return "LinkedIn";
    if (/(^|\.)youtube\.com$|youtu\.be$/.test(ref)) return "YouTube";
    if (/whatsapp|wa\.me/.test(ref)) return "WhatsApp";
    if (/(^|\.)(t\.co|x\.com|twitter\.com)$/.test(ref)) return "X (Twitter)";
    if (/(^|\.)(duckduckgo|yahoo|yandex)\./.test(ref)) return "Other search engine";
    return `Website: ${ref.replace(/^www\./, "")}`;
  }
  if (click === "fbclid") return "Facebook / Instagram";
  return "Direct";
}

// ---------- Browser ----------

const FIRST = "spinex-first-touch";
const LAST = "spinex-last-touch";
const DAYS_90 = 90 * 86400000;

const read = (k: string): Touch | null => {
  try {
    const v = JSON.parse(localStorage.getItem(k) || "null");
    return v && typeof v === "object" ? (v as Touch) : null;
  } catch {
    return null;
  }
};
const write = (k: string, t: Touch) => {
  try {
    localStorage.setItem(k, JSON.stringify(t));
  } catch {
    // storage blocked: the lead is still sent, just without the source
  }
};

// Run once per page load on the public site. A visit from an ad, a link or a search engine is remembered;
// a visit straight to the site (typed address, bookmark) keeps the last real source.
export function captureVisit() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const p = url.searchParams;
  const ownHost = window.location.hostname.replace(/^www\./, "");
  let refHost = "";
  try {
    refHost = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
  } catch {
    refHost = "";
  }
  if (refHost.replace(/^www\./, "") === ownHost) refHost = ""; // moving between our own pages
  const clickId = ["gclid", "gbraid", "wbraid", "fbclid", "msclkid", "ttclid", "li_fat_id"].find((k) => p.get(k)) ?? "";
  const touch: Touch = {
    utmSource: (p.get("utm_source") || "").slice(0, 100),
    utmMedium: (p.get("utm_medium") || "").slice(0, 100),
    utmCampaign: (p.get("utm_campaign") || "").slice(0, 150),
    utmTerm: (p.get("utm_term") || "").slice(0, 150),
    utmContent: (p.get("utm_content") || "").slice(0, 150),
    clickId,
    referrer: refHost.slice(0, 120),
    landingPage: `${url.pathname}${url.search}`.slice(0, 300),
    at: new Date().toISOString(),
  };
  const meaningful = touch.utmSource || touch.utmCampaign || touch.clickId || touch.referrer;
  const last = read(LAST);
  if (meaningful || !last) write(LAST, touch);
  const first = read(FIRST);
  if (!first || Date.now() - new Date(first.at).getTime() > DAYS_90) write(FIRST, touch);
}

// What is sent with an enquiry.
export function attributionForLead(): Partial<LeadTrack> {
  if (typeof window === "undefined") return {};
  const last = read(LAST);
  const first = read(FIRST);
  return {
    ...(last ?? {}),
    formPage: window.location.pathname.slice(0, 200),
    firstChannel: first ? channelOf(first) : "",
    firstAt: first?.at ?? "",
  };
}

// Server: keeps only short text fields and works out the channel itself.
export function cleanTrack(input: unknown): LeadTrack {
  const r = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = {} as Record<string, string>;
  for (const k of TRACK_FIELDS) out[k] = String(r[k] ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 300);
  const t = out as unknown as LeadTrack;
  t.channel = channelOf(t);
  if (t.firstChannel && !/^[\w ()/:.,'&+-]{1,80}$/.test(t.firstChannel)) t.firstChannel = "";
  return t;
}
