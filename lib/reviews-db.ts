// Server only. Google rating and reviews for the website (Places API, cached), and review requests to clients.
import { randomBytes } from "crypto";
import { unstable_cache } from "next/cache";
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "./db";
import { getSecret } from "./secrets";
import { readState, writeState } from "./settings-db";
import { emailPerson, notifyAdmin } from "./notify";
import { getContent } from "./content-server";
import { SITE_URL } from "./site";
import { cleanReviewSettings, defaultReviewSettings, writeReviewUrl, type ReviewRequest, type ReviewSettings, type SiteReview } from "./reviews";

export const reviewOid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

export async function getReviewSettings(): Promise<ReviewSettings> {
  const doc = await (await getDb()).collection<{ _id: string; value?: Record<string, unknown> }>("settings").findOne({ _id: "reviews" });
  return doc?.value ? cleanReviewSettings({ ...defaultReviewSettings, ...doc.value }) : defaultReviewSettings;
}
export async function saveReviewSettings(next: ReviewSettings) {
  await (await getDb()).collection<{ _id: string }>("settings").updateOne({ _id: "reviews" }, { $set: { value: next, updatedAt: new Date().toISOString() } }, { upsert: true });
}

export type GoogleData = { name: string; rating: number; count: number; mapsUrl: string; reviews: SiteReview[]; fetchedAt: string; error: string };
const PLACES = () => (process.env.PLACES_API_URL || "https://places.googleapis.com").replace(/\/+$/, "");
const FRESH = 12 * 3600e3;

// Asks Google for the rating and up to 5 reviews (Google gives at most 5 through the API).
export async function fetchGoogle(placeId: string): Promise<GoogleData> {
  const key = await getSecret("GOOGLE_PLACES_API_KEY");
  if (!key) throw new Error("Add the Google Places API key in Admin → API keys.");
  if (!placeId) throw new Error("Add your Google Place ID.");
  const res = await fetch(`${PLACES()}/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "displayName,rating,userRatingCount,googleMapsUri,reviews" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const d = (await res.json().catch(() => ({}))) as {
    displayName?: { text?: string }; rating?: number; userRatingCount?: number; googleMapsUri?: string; error?: { message?: string };
    reviews?: { name?: string; rating?: number; relativePublishTimeDescription?: string; text?: { text?: string }; originalText?: { text?: string }; googleMapsUri?: string; authorAttribution?: { displayName?: string; photoUri?: string; uri?: string } }[];
  };
  if (!res.ok) throw new Error(d.error?.message || `Google replied ${res.status}`);
  return {
    name: d.displayName?.text ?? "",
    rating: Number(d.rating) || 0,
    count: Number(d.userRatingCount) || 0,
    mapsUrl: d.googleMapsUri ?? "",
    reviews: (d.reviews ?? []).map((r, i) => ({
      id: String(r.name ?? i).split("/").pop()!.slice(0, 60),
      name: r.authorAttribution?.displayName ?? "Google user",
      photo: r.authorAttribution?.photoUri ?? "",
      rating: Number(r.rating) || 0,
      text: (r.text?.text || r.originalText?.text || "").trim(),
      when: r.relativePublishTimeDescription ?? "",
      url: r.googleMapsUri || r.authorAttribution?.uri || "",
    })),
    fetchedAt: new Date().toISOString(),
    error: "",
  };
}

// Cached copy, refreshed at most every 12 hours. A failed refresh keeps showing the last good copy.
export async function googleData(s: ReviewSettings, force = false): Promise<GoogleData | null> {
  const cache = (await readState("reviews_cache")) as Partial<GoogleData> & { placeId?: string };
  const same = cache.placeId === s.placeId;
  if (!force && same && cache.fetchedAt && Date.now() - Date.parse(cache.fetchedAt) < FRESH) return cache as GoogleData;
  try {
    const fresh = await fetchGoogle(s.placeId);
    await writeState("reviews_cache", { ...fresh, placeId: s.placeId });
    return fresh;
  } catch (e) {
    const error = e instanceof Error ? e.message : "Couldn't reach Google.";
    await writeState("reviews_cache", { error, errorAt: new Date().toISOString(), ...(same ? {} : { placeId: s.placeId, rating: 0, count: 0, reviews: [], fetchedAt: "" }) });
    if (force) throw e;
    return same && cache.fetchedAt ? (cache as GoogleData) : null;
  }
}

// What the home page shows. Cached with the page; saving settings or reloading from Google clears it ("reviews" tag).
export const siteReviews = unstable_cache(() => loadSiteReviews(), ["site-reviews"], { tags: ["reviews"], revalidate: 3600 });
async function loadSiteReviews() {
  const s = await getReviewSettings();
  if (!s.show) return null;
  let rating = s.manualRating, count = s.manualCount, mapsUrl = s.manualMapsUrl, list = s.manualReviews, fromGoogle = false;
  if (s.mode === "google") {
    const g = await googleData(s).catch(() => null);
    if (!g || !g.rating) return null;
    ({ rating, count, mapsUrl } = g);
    list = g.reviews;
    fromGoogle = true;
  }
  const reviews = list.filter((r) => r.rating >= s.minRating && r.text).slice(0, s.maxReviews);
  if (!rating && !reviews.length) return null;
  return { title: s.title, rating, count, mapsUrl, reviewUrl: writeReviewUrl(s), reviews, fromGoogle };
}

// ---------- Asking clients for a review ----------
let ready = false;
export async function requestsCol() {
  const col = (await getDb()).collection("review_requests");
  if (!ready) {
    await col.createIndex({ token: 1 }, { unique: true }).catch(() => undefined);
    await col.createIndex({ status: 1, sendAt: 1 }).catch(() => undefined);
    await col.createIndex({ email: 1, createdAt: -1 }).catch(() => undefined);
    ready = true;
  }
  return col;
}

export function toRequest(doc: WithId<Document>): ReviewRequest {
  const r = doc as WithId<Document> & Partial<ReviewRequest>;
  return {
    id: String(doc._id), name: r.name ?? "", email: r.email ?? "", phone: r.phone ?? "", project: r.project ?? "",
    source: r.source === "project" || r.source === "lead" ? r.source : "manual", refId: r.refId ?? "", token: r.token ?? "",
    status: (["scheduled", "sent", "clicked", "cancelled", "failed"].includes(String(r.status)) ? r.status : "scheduled") as ReviewRequest["status"],
    sendAt: r.sendAt ?? "", sentAt: r.sentAt ?? "", reminded: !!r.reminded, clickedAt: r.clickedAt ?? "", error: r.error ?? "", by: r.by ?? "", createdAt: r.createdAt ?? "",
  };
}

const okEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// Queues a review request. Skipped when the same email was asked in the last 6 months, so nobody is asked twice.
export async function queueReviewRequest(p: { name: string; email: string; phone?: string; project?: string; source: ReviewRequest["source"]; refId?: string; by?: string; now?: boolean }) {
  const email = p.email.trim().toLowerCase();
  if (!okEmail(email)) return { queued: false, reason: "no email" };
  const s = await getReviewSettings();
  if (!writeReviewUrl(s)) return { queued: false, reason: "Add your Google Place ID or review link first (Admin → Google reviews)." };
  const col = await requestsCol();
  if (!p.now && (await col.findOne({ email, status: { $ne: "cancelled" }, createdAt: { $gte: new Date(Date.now() - 180 * 864e5).toISOString() } }))) return { queued: false, reason: "already asked in the last 6 months" };
  const now = new Date();
  const sendAt = p.now ? now : new Date(now.getTime() + s.delayDays * 864e5);
  const doc = { name: p.name.trim().slice(0, 120), email, phone: (p.phone ?? "").slice(0, 20), project: (p.project ?? "").slice(0, 140), source: p.source, refId: p.refId ?? "", token: randomBytes(15).toString("base64url"), status: "scheduled", sendAt: sendAt.toISOString(), sentAt: "", reminded: false, clickedAt: "", error: "", by: p.by ?? "", createdAt: now.toISOString() };
  const { insertedId } = await col.insertOne(doc);
  if (p.now) await sendRequest(toRequest({ ...doc, _id: insertedId } as WithId<Document>), false);
  return { queued: true, id: String(insertedId) };
}

const fill = (t: string, r: ReviewRequest, brand: string) => t.replace(/\{name\}/g, r.name.split(" ")[0] || "there").replace(/\{project\}/g, r.project || "your project").replace(/\{brand\}/g, brand);

export async function sendRequest(r: ReviewRequest, reminder: boolean) {
  const s = await getReviewSettings();
  const brand = (await getContent().catch(() => null))?.brand.name || "Spinex IT Solutions";
  const link = `${SITE_URL}/r/${r.token}`;
  const paras = [`Hi ${r.name.split(" ")[0] || "there"},`, ...fill(s.message, r, brand).split(/\n{2,}/), ...(reminder ? ["(Just a gentle reminder. If you've already written one, thank you so much!)"] : []), `Team ${brand}`];
  const ok = await emailPerson(r.email, reminder ? `Reminder: ${fill(s.subject, r, brand)}` : fill(s.subject, r, brand), "Would you share a quick review?", paras, { label: "★ Write a Google review", url: link });
  const col = await requestsCol();
  const now = new Date().toISOString();
  if (reminder) await col.updateOne({ _id: reviewOid(r.id)! }, { $set: { reminded: true } });
  else await col.updateOne({ _id: reviewOid(r.id)!, status: "scheduled" }, ok ? { $set: { status: "sent", sentAt: now, error: "" } } : { $set: { status: "failed", error: "Email couldn't be sent. Check API keys → Email alerts." } });
  return ok;
}

// Run by the scheduler: sends requests that are due, and one reminder to people who didn't open the link.
export async function runReviewRequests() {
  const s = await getReviewSettings();
  const col = await requestsCol();
  const now = Date.now();
  let sent = 0;
  let reminders = 0;
  for (const d of await col.find({ status: "scheduled", sendAt: { $lte: new Date(now).toISOString() } }).limit(50).toArray()) {
    if (await sendRequest(toRequest(d), false)) sent++;
  }
  if (s.reminderDays > 0) {
    const before = new Date(now - s.reminderDays * 864e5).toISOString();
    for (const d of await col.find({ status: "sent", reminded: false, sentAt: { $lte: before } }).limit(50).toArray()) {
      // Claim first, so two scheduler runs can't both send it.
      const claim = await col.updateOne({ _id: d._id, reminded: false }, { $set: { reminded: true } });
      if (claim.modifiedCount && (await sendRequest(toRequest(d), true))) reminders++;
    }
  }
  if (sent || reminders) await writeState("reviews", { lastRun: new Date().toISOString(), lastResult: `${sent} sent, ${reminders} reminders` });
  return { sent, reminders };
}

// Someone opened their review link: note it once and tell the team.
export async function markClicked(token: string) {
  const col = await requestsCol();
  const doc = await col.findOneAndUpdate({ token, status: { $in: ["sent", "scheduled", "failed"] } }, { $set: { status: "clicked", clickedAt: new Date().toISOString(), error: "" } }, { returnDocument: "after" });
  if (doc) await notifyAdmin(`${doc.name} opened the Google review page`, [["Client", String(doc.name)], ["Project", String(doc.project || "-")], ["Tip", "Check Google in a few minutes and reply to their review."]], `${SITE_URL}/admin#reviews`).catch(() => undefined);
  return (await col.findOne({ token })) ? true : false;
}
