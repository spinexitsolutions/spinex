// Server only. Leads from ad lead forms (Meta Lead Ads, Google Ads lead forms) saved straight into Leads.
import { createHmac, timingSafeEqual, createHash } from "crypto";
import { leadsCol } from "./lead-db";
import { cleanTrack } from "./attribution";
import { announceLead } from "./lead-announce";
import { notifyAdmin } from "./notify";
import { readState, writeState } from "./settings-db";
import { SITE_URL } from "./site";

export type AdField = { key: string; label: string; value: string };
export type AdLead = {
  source: "meta" | "google";
  externalId: string; // Meta leadgen id / Google lead id: the same lead is never saved twice
  fields: AdField[];
  campaign: string;
  adName: string;
  formName: string;
  platform: string; // facebook / instagram / google
  clickId: string; // gclid for Google
  isTest: boolean;
  incomplete?: string; // why the details are missing (e.g. Meta token problem)
};

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const NAME = ["full_name", "name", "your_name", "fullname"];
const FIRST = ["first_name", "firstname"];
const LAST = ["last_name", "lastname", "surname"];
const PHONE = ["phone_number", "phone", "mobile", "mobile_number", "whatsapp_number", "contact_number", "work_phone_number"];
const EMAIL = ["email", "email_address", "work_email"];
const SERVICE = ["service", "services", "what_do_you_need", "requirement", "which_service", "interested_in"];
const BUDGET = ["budget", "your_budget"];
const MESSAGE = ["message", "comments", "details", "your_message"];
const HIDE = ["first_name", "last_name"]; // already in the name

const titleCase = (k: string) => k.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/^\w/, (c) => c.toUpperCase());

// Turns any form into the lead fields; questions we don't know go into the message, so nothing is lost.
export function mapFields(fields: AdField[]) {
  const pick = (keys: string[], word?: RegExp) => {
    const f = fields.find((x) => keys.includes(norm(x.key)) && x.value.trim()) ?? (word ? fields.find((x) => word.test(norm(x.key)) && x.value.trim()) : undefined);
    if (f) taken.add(f);
    return f?.value.trim() ?? "";
  };
  const taken = new Set<AdField>();
  const name = pick(NAME) || [pick(FIRST), pick(LAST)].filter(Boolean).join(" ");
  const phone = pick(PHONE).replace(/[^\d+]/g, "");
  const email = pick(EMAIL).toLowerCase();
  // Your own questions often say it in other words: "Which service do you need?", "What is your budget?".
  const services = pick(SERVICE, /service|requirement/);
  const budget = pick(BUDGET, /budget/);
  const message = pick(MESSAGE);
  const used = new Set([...NAME, ...PHONE, ...EMAIL, ...SERVICE, ...BUDGET, ...MESSAGE, ...HIDE]);
  const other = fields.filter((f) => f.value.trim() && !used.has(norm(f.key)) && !taken.has(f)).map((f) => `${f.label || titleCase(f.key)}: ${f.value.trim()}`);
  return { name: name.slice(0, 120) || "Ad lead", phone: phone.slice(0, 20), email: email.slice(0, 160), services: services.slice(0, 300), budget: budget.slice(0, 100), message: [message, ...other].filter(Boolean).join("\n").slice(0, 4000) };
}

let indexReady = false;
async function col() {
  const c = await leadsCol();
  if (!indexReady) {
    await c.createIndex({ adLeadId: 1 }, { unique: true, partialFilterExpression: { adLeadId: { $type: "string" } } }).catch(() => undefined);
    indexReady = true;
  }
  return c;
}

// Saves one ad lead (once). A lead saved without details (Meta token problem) is filled in when Meta sends it again.
export async function saveAdLead(a: AdLead) {
  const c = await col();
  const adLeadId = `${a.source}:${a.externalId}`;
  const d = mapFields(a.fields);
  const sourceName = a.source === "meta" ? (a.platform === "instagram" ? "instagram" : "facebook") : "google";
  const track = cleanTrack({ utmSource: sourceName, utmMedium: "paid", utmCampaign: a.campaign, utmContent: a.adName, clickId: a.clickId ? "gclid" : "", formPage: a.formName ? `Ad form: ${a.formName}` : "Ad lead form", landingPage: "" });
  const stamp = new Date().toISOString();
  const message = [a.isTest ? "TEST LEAD (sent from the ads setup screen)" : "", a.incomplete ? `Details couldn't be loaded from ${a.source === "meta" ? "Meta" : "Google"}: ${a.incomplete}. Open the Leads Center in Meta Business Suite for this lead (ID ${a.externalId}).` : "", d.message].filter(Boolean).join("\n\n");
  const doc = { ...d, message, plan: "", source: a.source, status: "new", value: "", followUp: "", followUpNote: "", assignedTo: "", assignedName: "", notes: "", track, adLeadId, adIncomplete: !!a.incomplete, adForm: a.formName, createdAt: stamp, updatedAt: stamp };

  const existing = await c.findOne({ adLeadId });
  if (existing) {
    if (existing.adIncomplete && !a.incomplete) {
      await c.updateOne({ _id: existing._id }, { $set: { ...d, message, track, adIncomplete: false, adForm: a.formName, updatedAt: stamp } });
      return { saved: true, updated: true };
    }
    return { saved: false, duplicate: true };
  }
  try {
    await c.insertOne(doc);
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { saved: false, duplicate: true };
    throw e;
  }
  await writeState("ad_leads", { [`last_${a.source}`]: stamp, [`last_${a.source}_name`]: d.name });
  await announceLead({
    data: { ...d, name: d.name, phone: d.phone },
    source: a.source,
    track,
    stamp,
    adminUrl: `${SITE_URL}/admin`,
    autoReply: !!d.email && !a.isTest,
    extraRows: [["Ad form", a.formName], ["Ad", a.adName], ...(a.incomplete ? [["Problem", a.incomplete] as [string, string]] : [])],
  });
  return { saved: true };
}

export async function noteAdError(source: "meta" | "google", error: string) {
  const state = await readState("ad_leads");
  await writeState("ad_leads", { [`error_${source}`]: error.slice(0, 300), [`error_${source}_at`]: new Date().toISOString() });
  // At most one alert email an hour about the same problem.
  const last = String(state[`error_${source}_alert`] ?? "");
  if (!last || Date.now() - Date.parse(last) > 3600e3) {
    await writeState("ad_leads", { [`error_${source}_alert`]: new Date().toISOString() });
    await notifyAdmin(`${source === "meta" ? "Meta" : "Google"} ad leads need attention`, [["Problem", error], ["What to do", "Open Admin → Leads → Get leads from ads and check the setup."]], `${SITE_URL}/admin#leads`).catch(() => undefined);
  }
}

export const safeEqual = (a: string, b: string) => {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
};

// Meta signs each webhook with the app secret: X-Hub-Signature-256: sha256=<hex>.
export function metaSignatureOk(raw: string, header: string, appSecret: string) {
  if (!appSecret || !header.startsWith("sha256=")) return false;
  return safeEqual(`sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}`, header);
}

export const adLeadsState = () => readState("ad_leads");
