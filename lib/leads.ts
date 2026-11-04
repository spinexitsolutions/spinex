// Shared lead (enquiry) types and helpers.
import { attributionForLead, type LeadTrack } from "./attribution";
import { track } from "./track";

export const LEAD_STATUSES = ["new", "contacted", "quote", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leadStatusLabel: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quote: "Quote sent",
  won: "Won",
  lost: "Lost",
};

export const LEAD_SOURCES = { contact: "Contact page", home: "Home page", planner: "Project planner", product: "Product demo request", city: "City page", meta: "Meta lead ad (Facebook / Instagram)", google: "Google Ads lead form", booking: "Call booking" } as const;
export type LeadSource = keyof typeof LEAD_SOURCES;

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  services: string;
  budget: string;
  message: string;
  plan: string; // planner summary
  source: LeadSource;
  status: LeadStatus;
  value: string; // deal value in rupees, optional
  followUp: string; // yyyy-mm-dd
  followUpNote: string; // e.g. "Call about the quote"
  assignedTo: string; // team member id ("env" = owner), "" = nobody
  assignedName: string;
  notes: string;
  lostReason?: string; // why the lead was lost (one of LOST_REASONS)
  lostNote?: string; // what they said
  history?: LeadNote[]; // every call / message / meeting and what they said, oldest first
  track?: LeadTrack; // where the visitor came from (ad, search, Instagram…)
  followups?: { day: number; at: string; ok: boolean; subject: string }[]; // automatic follow-up emails sent
  noFollowups?: boolean; // they (or we) stopped the follow-up emails
  createdAt: string;
  updatedAt: string;
};

export const LEAD_EDITABLE = ["name", "phone", "email", "services", "budget", "message", "status", "value", "followUp", "followUpNote", "assignedTo", "notes", "lostReason", "lostNote"] as const;

// One contact with the lead: a call, WhatsApp, email or meeting, and what came out of it.
export type LeadNote = { id: string; at: string; by: string; type: string; outcome: string; note: string };
export const NOTE_TYPES = ["Call", "WhatsApp", "Email", "Meeting"] as const;
export const NOTE_OUTCOMES = [
  "Interested",
  "Asked for a quote",
  "Call back later",
  "Thinking about it",
  "Didn't pick up",
  "Busy / no reply",
  "Negotiating price",
  "Not interested",
  "Other",
] as const;

// Why a lead didn't turn into a client. Asked when a lead is marked Lost.
export const LOST_REASONS = [
  "Price too high",
  "Went with someone else",
  "No reply / couldn't reach",
  "Not ready yet / maybe later",
  "Budget too small",
  "Only checking prices",
  "Wanted something we don't do",
  "Did it themselves / dropped the idea",
  "Not a real enquiry / spam",
  "Other",
] as const;

export function leadsToCSV(leads: Lead[]) {
  const cols: (keyof Lead)[] = ["createdAt", "name", "phone", "email", "services", "budget", "message", "plan", "source", "status", "value", "assignedName", "followUp", "followUpNote", "notes", "lostReason", "lostNote"];
  // A leading ' stops Excel / Sheets from running a value like =HYPERLINK(...) as a formula.
  const esc = (v: unknown) => `"${String(v ?? "").replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
  const show = (l: Lead, c: keyof Lead) => (c === "status" ? leadStatusLabel[l.status] : c === "source" ? LEAD_SOURCES[l.source] ?? l.source : l[c]);
  const extra = ["conversation history", "came via", "campaign", "keyword", "ad", "first found you via", "landing page"];
  const history = (l: Lead) => (l.history ?? []).map((h) => `${h.at.slice(0, 10)} ${h.type}${h.outcome ? ` (${h.outcome})` : ""}${h.note ? `: ${h.note}` : ""}${h.by ? ` [${h.by}]` : ""}`).join(" | ");
  const extraVals = (l: Lead) => [history(l), l.track?.channel, l.track?.utmCampaign, l.track?.utmTerm, l.track?.utmContent, l.track?.firstChannel, l.track?.landingPage];
  return "\uFEFF" + [[...cols, ...extra].join(","), ...leads.map((l) => [...cols.map((c) => esc(show(l, c))), ...extraVals(l).map(esc)].join(","))].join("\n");
}

// Used by the public forms.
export async function submitLead(data: Record<string, string>): Promise<{ ok: boolean; error?: string; errors?: Record<string, string> }> {
  // Sent with plain (non-lazy) code, so a page left open while the website was updated still sends.
  // A dropped connection is tried once more before giving up.
  let track_: ReturnType<typeof attributionForLead> | undefined;
  try {
    track_ = attributionForLead();
  } catch {
    track_ = undefined;
  }
  const send = () => fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, track: track_ }) });
  let res: Response;
  try {
    res = await send().catch(async () => {
      await new Promise((r) => setTimeout(r, 1200));
      return send();
    });
  } catch {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    return { ok: false, error: offline ? "No internet connection. Please try again or use WhatsApp." : "Couldn't reach our server just now. Please try again in a minute or message us on WhatsApp." };
  }
  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    try {
      track("generate_lead", { source: data.source || "form" });
    } catch {
      // analytics must never block the enquiry
    }
    return { ok: true };
  }
  return { ok: false, error: body.error || "Couldn't send. Please try WhatsApp.", errors: body.errors };
}
