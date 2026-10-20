// Shared lead (enquiry) types and helpers.

export const LEAD_STATUSES = ["new", "contacted", "quote", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leadStatusLabel: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quote: "Quote sent",
  won: "Won",
  lost: "Lost",
};

export const LEAD_SOURCES = { contact: "Contact page", home: "Home page", planner: "Project planner", product: "Product demo request" } as const;
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
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const LEAD_EDITABLE = ["name", "phone", "email", "services", "budget", "message", "status", "value", "followUp", "notes"] as const;

export function leadsToCSV(leads: Lead[]) {
  const cols: (keyof Lead)[] = ["createdAt", "name", "phone", "email", "services", "budget", "message", "plan", "source", "status", "value", "followUp", "notes"];
  // A leading ' stops Excel / Sheets from running a value like =HYPERLINK(...) as a formula.
  const esc = (v: unknown) => `"${String(v ?? "").replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
  const show = (l: Lead, c: keyof Lead) => (c === "status" ? leadStatusLabel[l.status] : c === "source" ? LEAD_SOURCES[l.source] ?? l.source : l[c]);
  return "\uFEFF" + [cols.join(","), ...leads.map((l) => cols.map((c) => esc(show(l, c))).join(","))].join("\n");
}

// Used by the public forms.
export async function submitLead(data: Record<string, string>): Promise<{ ok: boolean; error?: string; errors?: Record<string, string> }> {
  try {
    const res = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      const { track } = await import("./track");
      track("generate_lead", { source: data.source || "form" });
      return { ok: true };
    }
    return { ok: false, error: body.error || "Couldn't send. Please try WhatsApp.", errors: body.errors };
  } catch {
    return { ok: false, error: "No internet connection. Please try again or use WhatsApp." };
  }
}
