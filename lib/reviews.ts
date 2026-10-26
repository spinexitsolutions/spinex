// Google reviews on the website, and asking clients for a review. Shared by the server, admin screens and the site.

export type SiteReview = { id: string; name: string; photo: string; rating: number; text: string; when: string; url: string };
export type ReviewSettings = {
  show: boolean; // Google reviews section on the home page
  mode: "google" | "manual"; // google: live from the Places API; manual: typed in here
  placeId: string;
  reviewUrl: string; // "write a review" link; empty = made from the Place ID
  title: string;
  minRating: number; // show reviews with at least this many stars
  maxReviews: number;
  manualRating: number;
  manualCount: number;
  manualMapsUrl: string;
  manualReviews: SiteReview[];
  askOnProjectDone: boolean; // client portal project marked Completed
  askOnLeadWon: boolean; // lead marked Won (needs an email)
  delayDays: number; // wait this long after the trigger
  reminderDays: number; // one reminder if the link wasn't opened (0 = no reminder)
  subject: string;
  message: string; // {name} {project} {brand}
};

export const defaultReviewSettings: ReviewSettings = {
  show: false,
  mode: "google",
  placeId: "",
  reviewUrl: "",
  title: "What clients say on Google",
  minRating: 4,
  maxReviews: 6,
  manualRating: 0,
  manualCount: 0,
  manualMapsUrl: "",
  manualReviews: [],
  askOnProjectDone: true,
  askOnLeadWon: false,
  delayDays: 1,
  reminderDays: 5,
  subject: "How was your experience with {brand}?",
  message: "Thank you for choosing us for {project}. It was great working with you.\n\nIf you're happy with our work, could you share a short review on Google? It takes a minute and helps other businesses find us.",
};

export type RequestStatus = "scheduled" | "sent" | "clicked" | "cancelled" | "failed";
export const requestStatusLabel: Record<RequestStatus, string> = { scheduled: "Will be sent", sent: "Sent", clicked: "Opened the review page", cancelled: "Cancelled", failed: "Email failed" };
export type ReviewRequest = {
  id: string; name: string; email: string; phone: string; project: string;
  source: "project" | "lead" | "manual"; refId: string; token: string; status: RequestStatus;
  sendAt: string; sentAt: string; reminded: boolean; clickedAt: string; error: string; by: string; createdAt: string;
};

export const writeReviewUrl = (s: Pick<ReviewSettings, "reviewUrl" | "placeId">) =>
  s.reviewUrl || (s.placeId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(s.placeId)}` : "");

export function cleanReviewSettings(b: Record<string, unknown>): ReviewSettings {
  const d = defaultReviewSettings;
  const n = (v: unknown, min: number, max: number, def: number) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : def);
  const url = (v: unknown) => { const x = String(v ?? "").trim().slice(0, 500); return /^https:\/\//.test(x) ? x : ""; };
  const reviews = (Array.isArray(b.manualReviews) ? (b.manualReviews as Record<string, unknown>[]) : []).filter((r) => r && String(r.name ?? "").trim() && String(r.text ?? "").trim()).slice(0, 30).map((r, i) => ({
    id: String(r.id ?? "").replace(/[^\w-]/g, "").slice(0, 20) || `m${i}`,
    name: String(r.name).trim().slice(0, 80),
    photo: url(r.photo) || (String(r.photo ?? "").startsWith("/api/files/") ? String(r.photo).slice(0, 200) : ""),
    rating: Math.round(n(r.rating, 1, 5, 5)),
    text: String(r.text).trim().slice(0, 1500),
    when: String(r.when ?? "").trim().slice(0, 40),
    url: url(r.url),
  }));
  return {
    show: !!b.show,
    mode: b.mode === "manual" ? "manual" : "google",
    placeId: String(b.placeId ?? "").trim().replace(/[^\w-]/g, "").slice(0, 200),
    reviewUrl: url(b.reviewUrl),
    title: String(b.title ?? d.title).trim().slice(0, 100) || d.title,
    minRating: Math.round(n(b.minRating, 1, 5, d.minRating)),
    maxReviews: Math.round(n(b.maxReviews, 1, 12, d.maxReviews)),
    manualRating: Math.round(n(b.manualRating, 0, 5, 0) * 10) / 10,
    manualCount: Math.round(n(b.manualCount, 0, 1e6, 0)),
    manualMapsUrl: url(b.manualMapsUrl),
    manualReviews: reviews,
    askOnProjectDone: b.askOnProjectDone !== false,
    askOnLeadWon: !!b.askOnLeadWon,
    delayDays: Math.round(n(b.delayDays, 0, 30, d.delayDays)),
    reminderDays: Math.round(n(b.reminderDays, 0, 30, d.reminderDays)),
    subject: String(b.subject ?? d.subject).trim().slice(0, 150) || d.subject,
    message: String(b.message ?? d.message).trim().slice(0, 2000) || d.message,
  };
}
