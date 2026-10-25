// Server only. Client portal data: clients (with their projects), shared files and support tickets.
import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { GridFSBucket, ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "./db";
import { safeUrl } from "./content-sanitize";
import type { AmcPlan, PortalClient, PortalFile, PortalProject, StageStatus, Ticket } from "./portal";
import { SITE_URL } from "./site";

let clientsReady = false;
export async function clientsCol() {
  const col = (await getDb()).collection("portal_clients");
  if (!clientsReady) {
    await col.createIndex({ email: 1 }, { unique: true }).catch(() => undefined); // one login per email
    clientsReady = true;
  }
  return col;
}
export const ticketsCol = async () => (await getDb()).collection("portal_tickets");
export const portalFilesBucket = async () => new GridFSBucket(await getDb(), { bucketName: "portal_files" });
export const pOid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

// One-time login codes and links. Expired ones are removed by MongoDB on its own.
let loginsReady = false;
export async function loginsCol() {
  const col = (await getDb()).collection("portal_logins");
  if (!loginsReady) {
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
    // At most one live code per client, so racing "send code" requests can't add extra guesses.
    await col.createIndex({ kind: 1, clientId: 1 }, { unique: true, partialFilterExpression: { kind: "code" } }).catch(() => undefined);
    // Staff portal codes live here too (clientId "staff:<employee id>"), one per employee.
    await col.createIndex({ kind: 1, clientId: 1 }, { name: "one_staff_code", unique: true, partialFilterExpression: { kind: "staff-code" } }).catch(() => undefined);
    loginsReady = true;
  }
  return col;
}

const s = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const date = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");
const id = (v: unknown) => s(v, 24).replace(/[^\w-]/g, "") || Math.random().toString(36).slice(2, 10);
export const normEmail = (v: unknown) => s(v, 160).toLowerCase();
export const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export function toClient(doc: WithId<Document>): PortalClient {
  const r = doc as WithId<Document> & Partial<PortalClient>;
  return {
    id: String(doc._id),
    name: r.name ?? "",
    company: r.company ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    active: r.active !== false,
    projects: Array.isArray(r.projects) ? r.projects : [],
    billingIds: Array.isArray(r.billingIds) ? r.billingIds.map(String) : [],
    amcs: Array.isArray(r.amcs) ? (r.amcs as AmcPlan[]).map((a) => ({ ...a, sent: Array.isArray(a.sent) ? a.sent : [], renewals: Array.isArray(a.renewals) ? a.renewals : [], remind: a.remind !== false, amount: Number(a.amount) || 0 })) : [],
    notes: r.notes ?? "",
    lastLoginAt: r.lastLoginAt ?? "",
    invitedAt: r.invitedAt ?? "",
    createdAt: r.createdAt ?? "",
    updatedAt: r.updatedAt ?? "",
  };
}

// What the client may see about themselves (no private notes).
export const clientView = (c: PortalClient) => ({ ...c, notes: "" });

function cleanProject(p: Record<string, unknown>): PortalProject {
  const arr = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]).filter((x) => x && typeof x === "object") : []);
  const status = ["active", "on-hold", "completed"].includes(String(p.status)) ? (p.status as PortalProject["status"]) : "active";
  return {
    id: id(p.id),
    title: s(p.title, 140),
    type: s(p.type, 80),
    status,
    startDate: date(p.startDate),
    dueDate: date(p.dueDate),
    nextStep: s(p.nextStep, 600),
    stages: arr(p.stages).slice(0, 12).map((st) => ({
      id: id(st.id),
      title: s(st.title, 60),
      status: (["todo", "current", "done"].includes(String(st.status)) ? st.status : "todo") as StageStatus,
      date: date(st.date),
    })),
    updates: arr(p.updates).slice(0, 200).map((u) => ({ id: id(u.id), at: s(u.at, 30) || new Date().toISOString(), text: s(u.text, 2000), by: s(u.by, 80) })).filter((u) => u.text),
    links: arr(p.links).slice(0, 20).map((l) => ({ id: id(l.id), label: s(l.label, 80), url: safeUrl(l.url) })).filter((l) => l.url),
  };
}

function cleanAmc(a: Record<string, unknown>): AmcPlan {
  return {
    id: id(a.id),
    title: s(a.title, 120) || "AMC",
    covers: s(a.covers, 3000),
    startDate: date(a.startDate),
    endDate: date(a.endDate),
    amount: Math.max(0, Math.round((Number(a.amount) || 0) * 100) / 100),
    responseTime: s(a.responseTime, 80),
    remind: a.remind !== false,
    sent: [], // kept by the server (see keepAmcHistory)
    renewals: [],
  };
}

// Reminders already sent and renewal history come from the saved copy, never from the browser.
// Changing the end date starts the reminders again.
export function keepAmcHistory(next: AmcPlan[], before: unknown): AmcPlan[] {
  const old = new Map((Array.isArray(before) ? (before as AmcPlan[]) : []).map((a) => [a.id, a]));
  return next.map((a) => {
    const o = old.get(a.id);
    if (!o) return a;
    return { ...a, renewals: Array.isArray(o.renewals) ? o.renewals : [], sent: o.endDate === a.endDate && Array.isArray(o.sent) ? o.sent : [] };
  });
}

// Fields the admin screen may change.
export function cleanClientInput(b: Record<string, unknown>) {
  const out: Partial<PortalClient> = {};
  if (b.name !== undefined) out.name = s(b.name, 120);
  if (b.company !== undefined) out.company = s(b.company, 140);
  if (b.email !== undefined) out.email = normEmail(b.email);
  if (b.phone !== undefined) out.phone = s(b.phone, 30);
  if (b.notes !== undefined) out.notes = s(b.notes, 4000);
  if (b.active !== undefined) out.active = !!b.active;
  if (Array.isArray(b.projects)) out.projects = (b.projects as Record<string, unknown>[]).filter((x) => x && typeof x === "object").slice(0, 30).map(cleanProject);
  if (Array.isArray(b.amcs)) out.amcs = (b.amcs as Record<string, unknown>[]).filter((x) => x && typeof x === "object").slice(0, 20).map(cleanAmc);
  if (Array.isArray(b.billingIds)) out.billingIds = Array.from(new Set((b.billingIds as unknown[]).map((x) => s(x, 24)).filter((x) => ObjectId.isValid(x)))).slice(0, 200);
  return out;
}

export function toPortalFile(f: { _id: unknown; filename: string; length: number; uploadDate: Date; metadata?: Document }): PortalFile {
  const m = f.metadata ?? {};
  return {
    id: String(f._id),
    clientId: String(m.clientId ?? ""),
    projectId: String(m.projectId ?? ""),
    name: f.filename,
    size: f.length,
    contentType: String(m.contentType ?? "application/octet-stream"),
    by: m.by === "client" ? "client" : "team",
    byName: String(m.byName ?? ""),
    note: String(m.note ?? ""),
    uploadedAt: f.uploadDate.toISOString(),
  };
}

export function toTicket(doc: WithId<Document>): Ticket {
  const r = doc as WithId<Document> & Partial<Ticket>;
  return {
    id: String(doc._id),
    clientId: r.clientId ?? "",
    clientName: r.clientName ?? "",
    projectId: r.projectId ?? "",
    kind: (["problem", "change", "question", "renewal"].includes(String(r.kind)) ? r.kind : "question") as Ticket["kind"],
    urgent: !!r.urgent,
    amcId: r.amcId ?? "",
    amcTitle: r.amcTitle ?? "",
    amcCovered: !!r.amcCovered,
    subject: r.subject ?? "",
    status: (["open", "answered", "closed"].includes(String(r.status)) ? r.status : "open") as Ticket["status"],
    messages: Array.isArray(r.messages) ? r.messages : [],
    teamUnread: !!r.teamUnread,
    clientUnread: !!r.clientUnread,
    createdAt: r.createdAt ?? "",
    updatedAt: r.updatedAt ?? "",
  };
}

export async function getPortalClient(cid: string) {
  const _id = pOid(cid);
  const doc = _id && (await (await clientsCol()).findOne({ _id }));
  return doc ? toClient(doc) : null;
}

// ---------- Login codes and links ----------
const pepper = () => process.env.AUTH_SECRET || "";
export const hashSecret = (v: string) => createHash("sha256").update(`${pepper()}:${v}`).digest("hex");
export const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const newLoginCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const newLinkToken = () => randomBytes(24).toString("base64url");

// Links in emails: the public website address in production, this server while testing.
export const originOf = (req: Request) => (process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin);

// Allowed file types for portal uploads. Anything else is refused; downloads are always sent as attachments.
export const PORTAL_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", txt: "text/plain",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic",
  zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed",
  mp4: "video/mp4", mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav",
  ai: "application/postscript", eps: "application/postscript", psd: "image/vnd.adobe.photoshop", cdr: "application/vnd.corel-draw", fig: "application/octet-stream",
};
export const fileExt = (name: string) => (name.split(".").pop() || "").toLowerCase();

// Saves one uploaded file for a client. Returns an error message, or the saved file id.
export async function savePortalFile(file: File, meta: { clientId: string; projectId: string; by: "team" | "client"; byName: string; note: string }) {
  const ext = fileExt(file.name || "");
  const type = PORTAL_FILE_TYPES[ext];
  if (!type) return { error: `${file.name || "This file"} isn't an allowed type. Use PDF, Word, Excel, images, ZIP or video.` };
  if (file.size > 10 * 1024 * 1024) return { error: `${file.name} is larger than 10 MB. Share big files as a Google Drive link in a message instead.` };
  if (!file.size) return { error: `${file.name} is empty.` };
  const name = (file.name || `file.${ext}`).replace(/[\\/\u0000-\u001f"<>]/g, "_").slice(0, 140);
  const bucket = await portalFilesBucket();
  const id = await new Promise<ObjectId>((resolve, reject) => {
    const up = bucket.openUploadStream(name, { metadata: { ...meta, note: meta.note.slice(0, 300), contentType: type } });
    up.on("error", reject).on("finish", () => resolve(up.id as ObjectId));
    file.arrayBuffer().then((b) => up.end(Buffer.from(b)), reject);
  });
  return { id: String(id) };
}

export async function listPortalFiles(clientId: string) {
  const files = await (await portalFilesBucket()).find({ "metadata.clientId": clientId }, { sort: { uploadDate: -1 }, limit: 500 }).toArray();
  return files.map(toPortalFile);
}

// Portal POST routes accept JSON only, so a form on another site can't post to them (login CSRF).
export const isJsonRequest = (req: Request) => (req.headers.get("content-type") || "").toLowerCase().includes("application/json");
export const tooBig = (req: Request) => Number(req.headers.get("content-length") || 0) > 11 * 1024 * 1024;

// Failed code tries per client: after 10 in a day the email login is locked for the rest of that day.
export const MAX_DAILY_FAILS = 10;
export async function loginLocked(clientId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const doc = await (await getDb()).collection<{ _id: string; n: number }>("rate_counters").findOne({ _id: `portal-fail:${clientId}|${day}` });
  return (doc?.n ?? 0) >= MAX_DAILY_FAILS;
}
export async function countLoginFail(clientId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const doc = await (await getDb()).collection<{ _id: string; n: number; at: Date }>("rate_counters").findOneAndUpdate(
    { _id: `portal-fail:${clientId}|${day}` },
    { $inc: { n: 1 }, $setOnInsert: { at: new Date() } },
    { upsert: true, returnDocument: "after" },
  ).catch(() => null);
  return doc?.n ?? 0;
}
