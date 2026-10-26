// Shared intern types and helpers (used by both server routes and admin screens).

export const STATUSES = ["applied", "selected", "active", "completed", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export const statusLabel: Record<Status, string> = {
  applied: "Applied",
  selected: "Selected",
  active: "Working",
  completed: "Completed",
  rejected: "Not selected",
};

export type Intern = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  college: string;
  role: string;
  mode: string;
  duration: string;
  link: string;
  why: string;
  status: Status;
  startDate: string; // yyyy-mm-dd
  endDate: string;
  mentor: string;
  work: string; // shown on the certificate when filled
  notes: string; // private
  certId: string;
  issuedOn: string;
  resumeId: string;
  resumeName: string;
  source: "website" | "admin" | "careers";
  kind: "internship" | "job";
  experience: string;
  createdAt: string;
};

// Fields the admin can edit. Certificate number, resume and timestamps are managed by the server.
export const EDITABLE = ["name", "email", "phone", "city", "college", "role", "mode", "duration", "experience", "link", "why", "status", "startDate", "endDate", "mentor", "work", "notes"] as const;
export type EditableField = (typeof EDITABLE)[number];

export const blankIntern = (): Intern => ({
  id: "", name: "", email: "", phone: "", city: "", college: "", role: "", mode: "", duration: "", link: "", why: "",
  status: "applied", startDate: "", endDate: "", mentor: "", work: "", notes: "", certId: "", issuedOn: "",
  resumeId: "", resumeName: "", source: "admin", kind: "internship", experience: "", createdAt: "",
});

export function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

// Turns a WhatsApp/email application (from the website form) into fields.
export function parseApplication(text: string): Partial<Intern> {
  const get = (label: string) => text.match(new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "im"))?.[1].trim() ?? "";
  return {
    role: get("Internship application") || get("Role"),
    name: get("Name"),
    email: get("Email"),
    phone: get("Phone"),
    city: get("City"),
    college: get("College / course") || get("College"),
    duration: get("Duration"),
    mode: get("Work mode"),
    link: get("Resume / portfolio"),
    why: text.split(/why i want to join:\s*/i)[1]?.trim() ?? "",
  };
}

export function toCSV(interns: Intern[]) {
  const cols: (keyof Intern)[] = ["kind", "name", "email", "phone", "city", "college", "role", "experience", "mode", "duration", "status", "startDate", "endDate", "mentor", "work", "certId", "issuedOn", "link", "why", "notes", "createdAt"];
  // A leading ' stops Excel / Sheets from running a value like =HYPERLINK(...) as a formula.
  const esc = (v: unknown) => `"${String(v ?? "").replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
  return "\uFEFF" + [cols.join(","), ...interns.map((i) => cols.map((c) => esc(c === "status" ? statusLabel[i.status] : i[c])).join(","))].join("\n");
}
