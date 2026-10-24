// Admin roles and what each person can open. Shared by server and admin screens.
//
// Every team member has an "access" list: for each area, None, View (look only) or Edit (look and change).
// The 5 roles are ready-made starting points; the owner can then tick each area per person.
// Team, API keys and automation/backups are always owner-only.

export const ROLES = ["owner", "admin", "editor", "sales", "hr"] as const;
export type Role = (typeof ROLES)[number];

export const roleLabel: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Content editor",
  sales: "Sales",
  hr: "HR",
};

export const roleHelp: Record<Role, string> = {
  owner: "Everything, including team members",
  admin: "Everything except team members, API keys and backups",
  editor: "Website content, blog, media and SEO",
  sales: "Leads, quotations and invoices",
  hr: "Interns, job applicants, certificates and HR letters",
};

export type Level = "none" | "view" | "edit";

const AREA_LIST = [
  { id: "dashboard", label: "Dashboard", help: "The numbers on the overview page", viewOnly: true },
  { id: "leads", label: "Leads", help: "Enquiries, follow-ups and giving leads to people" },
  { id: "billing", label: "Quotations and invoices", help: "Make, edit, send and mark invoices as paid" },
  { id: "billingDetails", label: "Billing details", help: "Bank account, GSTIN, signatures on invoices" },
  { id: "content", label: "Website content", help: "Pages, services, projects, products, home page, SEO, banners, colours, chatbot" },
  { id: "blog", label: "Blog posts", help: "Write, publish and delete articles" },
  { id: "media", label: "Image library", help: "Upload and delete images" },
  { id: "people", label: "Interns, applicants, certificates and HR letters", help: "Applications, status emails, certificates, offer and experience letters" },
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
  editor: { ...all("none"), dashboard: "view", content: "edit", blog: "edit", media: "edit" },
  sales: { ...all("none"), dashboard: "view", leads: "edit", billing: "edit", billingDetails: "view" },
  hr: { ...all("none"), dashboard: "view", people: "edit", media: "view" },
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
