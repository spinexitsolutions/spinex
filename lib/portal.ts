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

export type PortalClient = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  active: boolean;
  projects: PortalProject[];
  billingIds: string[]; // quotations and invoices shown in the portal
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
export type Ticket = {
  id: string;
  clientId: string;
  clientName: string;
  projectId: string;
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
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
