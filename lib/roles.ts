// Admin roles and what each person can open. Shared by server and admin screens.
//
// Every team member has an "access" list: for each area, None, View (look only) or Edit (look and change).
// The roles are ready-made starting points; the owner can then tick each area per person.
// Team, API keys and automation/backups are always owner-only.

export const ROLES = ["owner", "admin", "manager", "editor", "writer", "marketing", "designer", "sales", "telecaller", "support", "projectManager", "accountant", "hr", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const roleLabel: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  editor: "Content editor",
  writer: "Blog writer",
  marketing: "Marketing / SEO",
  designer: "Designer",
  sales: "Sales",
  telecaller: "Telecaller",
  support: "Support executive",
  projectManager: "Project manager",
  accountant: "Accountant",
  hr: "HR",
  viewer: "Viewer (look only)",
};

export const roleHelp: Record<Role, string> = {
  owner: "Everything, including team members",
  admin: "Everything except team members, API keys and backups",
  manager: "Runs the day to day: leads, clients, invoices, website and interns. No salaries, profit or bank details",
  editor: "Website content, blog, media and SEO",
  writer: "Writes and publishes blog posts only",
  marketing: "Website content, blog, SEO, tracking codes, and sees where leads come from",
  designer: "Image library, and can look at website content, blog and client projects",
  sales: "Leads, quotations, invoices and the client portal",
  telecaller: "Calls and updates leads only (no invoices or client data)",
  support: "Client portal: support requests, AMC, project updates and files",
  projectManager: "Client projects, files and support requests; can look at leads and invoices",
  accountant: "Invoices, payments, billing details, expenses, profit and GST; can look at payslips",
  hr: "Interns, job applicants, certificates, HR letters and payslips",
  viewer: "Can look at most things but change nothing (no salaries or profit)",
};

export type Level = "none" | "view" | "edit";

const AREA_LIST = [
  { id: "dashboard", label: "Dashboard", help: "The numbers on the overview page", viewOnly: true },
  { id: "leads", label: "Leads", help: "Enquiries, follow-ups and giving leads to people" },
  { id: "billing", label: "Quotations and invoices", help: "Make, edit, send and mark invoices as paid" },
  { id: "billingDetails", label: "Billing details", help: "Bank account, GSTIN, signatures on invoices" },
  { id: "clients", label: "Client portal", help: "Client logins, project status, shared files and support requests" },
  { id: "content", label: "Website content", help: "Pages, services, projects, products, home page, SEO, banners, colours, chatbot" },
  { id: "blog", label: "Blog posts", help: "Write, publish and delete articles" },
  { id: "media", label: "Image library", help: "Upload and delete images" },
  { id: "people", label: "Interns, applicants, certificates and HR letters", help: "Applications, status emails, certificates, offer and experience letters" },
  { id: "payroll", label: "Employees, payslips, attendance and leave", help: "Salary details, monthly payslips, approving leave and marking attendance" },
  { id: "accounts", label: "Expenses, profit and GST report", help: "Add business expenses, see monthly profit and loss (includes total salaries) and the GST summary" },
  { id: "integrations", label: "WhatsApp button, analytics and cookie banner", help: "Tracking codes that run on every page" },
  { id: "activity", label: "Everyone's activity log", help: "Without this they see only their own", viewOnly: true },
] as const;

export type Area = (typeof AREA_LIST)[number]["id"];
export type AreaInfo = { id: Area; label: string; help: string; viewOnly?: boolean };
export const AREAS: readonly AreaInfo[] = AREA_LIST;
export type Access = Record<Area, Level>;

const all = (level: Level): Access => Object.fromEntries(AREAS.map((a) => [a.id, a.viewOnly && level === "edit" ? "view" : level])) as Access;

export const ROLE_ACCESS: Record<Role, Access> = {
  owner: all("edit"),
  admin: all("edit"),
  manager: { ...all("edit"), billingDetails: "view", payroll: "none", accounts: "none" },
  editor: { ...all("none"), dashboard: "view", content: "edit", blog: "edit", media: "edit" },
  writer: { ...all("none"), blog: "edit", media: "edit" },
  marketing: { ...all("none"), dashboard: "view", content: "edit", blog: "edit", media: "edit", integrations: "edit", leads: "view" },
  designer: { ...all("none"), media: "edit", content: "view", blog: "view", clients: "view" },
  sales: { ...all("none"), dashboard: "view", leads: "edit", billing: "edit", billingDetails: "view", clients: "edit" },
  telecaller: { ...all("none"), dashboard: "view", leads: "edit" },
  support: { ...all("none"), dashboard: "view", clients: "edit", leads: "view", media: "view" },
  projectManager: { ...all("none"), dashboard: "view", clients: "edit", leads: "view", billing: "view", media: "edit" },
  accountant: { ...all("none"), dashboard: "view", billing: "edit", billingDetails: "edit", accounts: "edit", payroll: "view", clients: "view" },
  hr: { ...all("none"), dashboard: "view", people: "edit", payroll: "edit", media: "view" },
  viewer: { ...all("view"), payroll: "none", accounts: "none", billingDetails: "none", activity: "none" },
};

// Keeps only known areas and levels ("edit" on a look-only area becomes "view"). Missing areas: from the role.
export function cleanAccess(input: unknown, role: Role): Access {
  const base = ROLE_ACCESS[role] ?? ROLE_ACCESS.editor;
  const r = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = { ...base };
  for (const a of AREAS) {
    const v = r[a.id];
    if (v === "none" || v === "view" || v === "edit") out[a.id] = a.viewOnly && v === "edit" ? "view" : v;
  }
  return out;
}

// What someone can do: the owner can do everything; others use their saved access (or their role's).
export type Who = { role?: Role; uid?: string; access?: Partial<Access> | null } | null | undefined;
export function accessOf(who: Who): Access {
  if (!who) return all("none");
  if (who.role === "owner" || who.uid === "env") return all("edit");
  return cleanAccess(who.access ?? null, (who.role ?? "editor") as Role);
}

export const allowed = (who: Who, area: Area, level: Level = "view") => {
  const have = accessOf(who)[area];
  return level === "view" ? have === "view" || have === "edit" : have === "edit";
};

export const isOwner = (who: Who) => !!who && (who.role === "owner" || who.uid === "env");

export const sameAccess = (a: Access, b: Access) => AREAS.every((x) => a[x.id] === b[x.id]);

// Old checks used before per-person access existed; "users" means owner-only.
export type Perm = Area | "users" | "stats";
export function can(who: Who | Role | undefined, perm: Perm, level: Level = "view") {
  const w: Who = typeof who === "string" ? { role: who } : who;
  if (perm === "users") return isOwner(w);
  if (perm === "stats") return allowed(w, "dashboard", "view");
  return allowed(w, perm, level);
}
