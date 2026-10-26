// Client portal: shared types and helpers (server routes, admin screens and portal pages).

export type StageStatus = "todo" | "current" | "done";
export type PortalStage = { id: string; title: string; status: StageStatus; date: string };
export type PortalUpdate = { id: string; at: string; text: string; by: string };
export type PortalLink = { id: string; label: string; url: string };
export type ProjectStatus = "active" | "on-hold" | "completed";

export type PortalProject = {
  id: string;
  title: string;
  type: string; // e.g. E-commerce website
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
  nextStep: string; // "What we need from you" or "What happens next"
  stages: PortalStage[];
  updates: PortalUpdate[];
  links: PortalLink[];
};

// Annual maintenance contract (AMC). Dates are India dates (YYYY-MM-DD), both days included.
export type AmcPlan = {
  id: string;
  title: string; // e.g. Website AMC (Basic)
  covers: string; // what's included, one point per line
  startDate: string;
  endDate: string;
  amount: number; // yearly price for the renewal, before GST
  responseTime: string; // e.g. Within 1 working day
  remind: boolean; // renewal reminders by email
  sent: string[]; // reminders already sent, like "2027-03-31:30"
  renewals: { at: string; by: string; from: string; to: string }[];
};
export type AmcState = "upcoming" | "active" | "expiring" | "expired";

export type PortalClient = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  active: boolean;
  projects: PortalProject[];
  billingIds: string[]; // quotations and invoices shown in the portal
  amcs: AmcPlan[];
  notes: string; // private, never shown to the client
  lastLoginAt: string;
  invitedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PortalFile = {
  id: string;
  clientId: string;
  projectId: string;
  name: string;
  size: number;
  contentType: string;
  by: "team" | "client";
  byName: string;
  note: string;
  uploadedAt: string;
};

export type TicketMessage = { id: string; from: "client" | "team"; name: string; text: string; at: string };
export type TicketStatus = "open" | "answered" | "closed";
export type TicketKind = "problem" | "change" | "question" | "renewal";
export type Ticket = {
  id: string;
  clientId: string;
  clientName: string;
  projectId: string;
  kind: TicketKind;
  urgent: boolean;
  amcId: string; // the AMC that covered the request when it was opened ("" = none)
  amcTitle: string;
  amcCovered: boolean;
  subject: string;
  status: TicketStatus;
  messages: TicketMessage[];
  teamUnread: boolean;
  clientUnread: boolean;
  createdAt: string;
  updatedAt: string;
};

export const projectStatusLabel: Record<ProjectStatus, string> = { active: "In progress", "on-hold": "On hold", completed: "Completed" };
export const ticketStatusLabel: Record<TicketStatus, string> = { open: "Waiting for team", answered: "Team replied", closed: "Closed" };

export const ticketKindLabel: Record<TicketKind, string> = { problem: "Problem / complaint", change: "Change request", question: "Question", renewal: "AMC renewal" };

export const DEFAULT_STAGES = ["Requirements", "Design", "Development", "Testing", "Go live"];

const rid = () => Math.random().toString(36).slice(2, 10);
export const blankProject = (): PortalProject => ({
  id: rid(),
  title: "",
  type: "",
  status: "active",
  startDate: "",
  dueDate: "",
  nextStep: "",
  stages: DEFAULT_STAGES.map((title, i) => ({ id: rid(), title, status: i === 0 ? "current" : "todo", date: "" })),
  updates: [],
  links: [],
});

// Progress from the stages: done stages count fully, the current one half.
export function projectProgress(p: Pick<PortalProject, "stages" | "status">) {
  if (p.status === "completed") return 100;
  const n = p.stages.length;
  if (!n) return 0;
  const score = p.stages.reduce((s, st) => s + (st.status === "done" ? 1 : st.status === "current" ? 0.5 : 0), 0);
  return Math.round((score / n) * 100);
}
export const currentStage = (p: Pick<PortalProject, "stages">) => p.stages.find((s) => s.status === "current") ?? [...p.stages].reverse().find((s) => s.status === "done");

export const MAX_PORTAL_FILE = 10 * 1024 * 1024;
export const fileSizeText = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export const shortDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};

// ---------- AMC ----------
export const todayIndia = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const dayMs = 86400000;
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / dayMs);
export const addDaysTo = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * dayMs).toISOString().slice(0, 10);
// One year later, minus a day: 2026-04-01 → 2027-03-31.
export const yearEnd = (start: string) => {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return new Date(d.getTime() - dayMs).toISOString().slice(0, 10);
};
export const AMC_SOON_DAYS = 30;

// Days left including today (0 = ends today, negative = expired that many days ago).
export const amcDaysLeft = (a: Pick<AmcPlan, "endDate">, today = todayIndia()) => (a.endDate ? daysBetween(today, a.endDate) : NaN);

export function amcState(a: Pick<AmcPlan, "startDate" | "endDate"> & { renewals?: AmcPlan["renewals"] }, today = todayIndia()): AmcState {
  if (!a.endDate) return "active";
  // Renewed early: the new year starts after the old one ends, so it is still covered in between.
  if (a.startDate && a.startDate > today) return a.renewals?.some((r) => r.from === a.startDate) ? "active" : "upcoming";
  const left = daysBetween(today, a.endDate);
  if (left < 0) return "expired";
  return left <= AMC_SOON_DAYS ? "expiring" : "active";
}

export const amcStateLabel = (a: Pick<AmcPlan, "startDate" | "endDate"> & { renewals?: AmcPlan["renewals"] }, today = todayIndia()) => {
  const st = amcState(a, today);
  const left = amcDaysLeft(a, today);
  if (st === "upcoming") return `Starts ${shortDate(a.startDate)}`;
  if (st === "expired") return `Expired ${shortDate(a.endDate)}`;
  if (st === "expiring") return left === 0 ? "Ends today" : `Ends in ${left} day${left === 1 ? "" : "s"}`;
  return a.endDate ? `Valid till ${shortDate(a.endDate)}` : "Active";
};

// The AMC that covers today, else the one that ended last (for "renew" messages).
export function mainAmc(amcs: AmcPlan[], today = todayIndia()) {
  const live = amcs.filter((a) => ["active", "expiring"].includes(amcState(a, today))).sort((a, b) => a.endDate.localeCompare(b.endDate));
  if (live.length) return live[live.length - 1];
  return [...amcs].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
}
export const coveringAmc = (amcs: AmcPlan[], today = todayIndia()) => amcs.find((a) => ["active", "expiring"].includes(amcState(a, today)));

export const blankAmc = (): AmcPlan => {
  const start = todayIndia();
  return {
    id: rid(),
    title: "Website AMC",
    covers: "Website kept online and working\nSecurity and plugin updates\nUp to 5 small content changes a month\nMonthly backup",
    startDate: start,
    endDate: yearEnd(start),
    amount: 0,
    responseTime: "Within 1 working day",
    remind: true,
    sent: [],
    renewals: [],
  };
};
