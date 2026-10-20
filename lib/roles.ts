// Admin roles and what each one can open. Shared by server and admin screens.

export const ROLES = ["owner", "admin", "editor", "sales", "hr"] as const;
export type Role = (typeof ROLES)[number];

export type Perm = "content" | "leads" | "people" | "users" | "stats";

export const roleLabel: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Content editor",
  sales: "Sales",
  hr: "HR",
};

export const roleHelp: Record<Role, string> = {
  owner: "Everything, including team members",
  admin: "Everything except team members",
  editor: "Website content, blog, media and SEO",
  sales: "Leads and the dashboard",
  hr: "Interns, job applicants and certificates",
};

const PERMS: Record<Role, Perm[]> = {
  owner: ["content", "leads", "people", "users", "stats"],
  admin: ["content", "leads", "people", "stats"],
  editor: ["content", "stats"],
  sales: ["leads", "stats"],
  hr: ["people", "stats"],
};

export const can = (role: Role | undefined, perm: Perm) => !!role && (PERMS[role] ?? []).includes(perm);
