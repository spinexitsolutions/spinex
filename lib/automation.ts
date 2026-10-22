// Server only. Jobs that run on a schedule (see app/api/cron): follow-up reminders and database backups.
import { gunzipSync, gzipSync } from "zlib";
import { randomBytes } from "crypto";
import { BSON, GridFSBucket } from "mongodb";

// The mongodb package (v6) offers EJSON inside BSON. EJSON keeps ObjectIds and dates exact in backups.
const { EJSON } = BSON;
import { getDb } from "./db";
import { readSetting, readState, writeSetting, writeState } from "./settings-db";
import { leadsCol, toLead } from "./lead-db";
import { leadTeam } from "./team";
import { emailFile, emailPerson, smtpSettings } from "./notify";
import { sendWhatsAppAlert } from "./whatsapp-alert";

export type AutomationSettings = {
  remindersOn: boolean;
  reminderHour: number; // 0–23, India time
  whatsappSummary: boolean; // also a WhatsApp summary to you (needs WhatsApp alerts set up)
  backupFrequency: string; // "off" | "daily" | "weekly"
  backupWeekday: number; // 0 = Sunday
  backupEmail: string; // empty = the "Send alerts to" email
};

export const defaultAutomation: AutomationSettings = {
  remindersOn: true,
  reminderHour: 9,
  whatsappSummary: true,
  backupFrequency: "weekly",
  backupWeekday: 0,
  backupEmail: "",
};

export const getAutomation = () => readSetting("automation", defaultAutomation);
export const saveAutomation = (input: Record<string, unknown>) => {
  const freq = String(input.backupFrequency ?? "");
  if ("backupFrequency" in input && !["off", "daily", "weekly"].includes(freq)) input.backupFrequency = "weekly";
  if ("reminderHour" in input) input.reminderHour = Math.min(23, Math.max(0, Math.round(Number(input.reminderHour) || 0)));
  if ("backupWeekday" in input) input.backupWeekday = Math.min(6, Math.max(0, Math.round(Number(input.backupWeekday) || 0)));
  if ("backupEmail" in input) input.backupEmail = String(input.backupEmail ?? "").trim().slice(0, 200);
  return writeSetting("automation", defaultAutomation, input);
};

// India time parts, whatever time zone the server runs in.
export function nowIST() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours(), weekday: d.getUTCDay() };
}

// The secret part of the scheduler link. Made once and kept in the database; CRON_SECRET in .env also works (Vercel Cron).
export async function cronKey() {
  const state = await readState("automation");
  if (typeof state.cronKey === "string" && state.cronKey.length >= 24) return state.cronKey;
  const key = randomBytes(24).toString("base64url");
  await writeState("automation", { cronKey: key });
  return key;
}

// ---------- Follow-up reminders ----------

export async function runReminders(origin: string) {
  const today = nowIST().date;
  const due = (await (await leadsCol()).find({ followUp: { $ne: "", $lte: today }, status: { $nin: ["won", "lost"] } }).sort({ followUp: 1 }).limit(500).toArray()).map(toLead);
  const settings = await getAutomation();
  if (!due.length) {
    await writeState("automation", { lastReminders: today, lastRemindersResult: "No follow-ups due" });
    return { sent: 0, due: 0 };
  }
  const team = await leadTeam();
  const owner = team.find((m) => m.id === "env");
  // Leads given to someone go to them; the rest go to you.
  const groups = new Map<string, typeof due>();
  for (const l of due) {
    const who = team.some((m) => m.id === l.assignedTo) ? l.assignedTo : "env";
    groups.set(who, [...(groups.get(who) ?? []), l]);
  }
  let sent = 0;
  for (const [who, leads] of groups) {
    const m = team.find((x) => x.id === who) ?? owner;
    if (!m?.email) continue;
    const lines = leads.slice(0, 40).map((l) => {
      const late = l.followUp < today ? ` (was due ${l.followUp})` : "";
      return `• ${l.name}, ${l.phone}${l.services ? `, ${l.services}` : ""}${late}${l.followUpNote ? `\n   ${l.followUpNote}` : ""}`;
    });
    const ok = await emailPerson(
      m.email,
      `${leads.length} follow-up${leads.length > 1 ? "s" : ""} for today`,
      `Good morning${m.id === "env" ? "" : `, ${m.name.split(" ")[0]}`}! Here is who to follow up with today`,
      [lines.join("\n"), leads.length > 40 ? `…and ${leads.length - 40} more in the admin panel.` : "Open the lead to call, WhatsApp, or set the next follow-up date."],
      { label: "Open leads", url: `${origin}/admin#leads` },
    );
    if (ok) sent++;
  }
  if (settings.whatsappSummary) {
    const names = due.slice(0, 10).map((l) => `• ${l.name} (${l.phone})${l.assignedName ? ` – ${l.assignedName}` : ""}${l.followUpNote ? `: ${l.followUpNote}` : ""}`).join("\n");
    await sendWhatsAppAlert(`⏰ ${due.length} follow-up${due.length > 1 ? "s" : ""} due today\n\n${names}${due.length > 10 ? `\n…and ${due.length - 10} more` : ""}\n\nOpen: ${origin}/admin#leads`).catch(() => null);
  }
  await writeState("automation", { lastReminders: today, lastRemindersResult: `${due.length} due, ${sent} email${sent === 1 ? "" : "s"} sent` });
  return { sent, due: due.length };
}

// ---------- Database backup ----------

// Image files are left out (they can be large); everything else is included. Passwords and API keys are never included.
const SKIP = (name: string) =>
  name.startsWith("uploads.") || name.startsWith("safety_backups.") || name === "rate_limits" || name === "secrets" || name === "password_resets" || name.startsWith("system.");

// Settings documents that stay out of backups and are never replaced by a restore:
// job state (scheduler key), the owner's login (password, two-step secret) and unsaved previews.
const PRIVATE_SETTING = (id: unknown) => {
  const s = String(id);
  return s.startsWith("state:") || s === "owner_account" || s.startsWith("content_preview:") || s.startsWith("post_preview:");
};
// Login secrets removed from team members in a backup.
const LOGIN_FIELDS = ["passwordHash", "totpSecret", "totpPending", "totpLastStep", "backupCodes"];

// Never replaced by a restore: team logins (a backup has no passwords, so restoring them would lock people out),
// API keys and internal collections.
const NO_RESTORE = (name: string) => SKIP(name) || name === "admin_users";

export async function createBackup() {
  const db = await getDb();
  const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).filter((n) => !SKIP(n)).sort();
  const collections: Record<string, unknown[]> = {};
  let count = 0;
  for (const name of names) {
    const docs = await db.collection(name).find({}).toArray();
    collections[name] =
      name === "admin_users" ? docs.map((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !LOGIN_FIELDS.includes(k))))
      // Job state, the owner's login and previews are left out, so a backup can't be used to log in or run the jobs.
      : name === "settings" ? docs.filter((d) => !PRIVATE_SETTING(d._id))
      : docs;
    count += docs.length;
  }
  const createdAt = new Date().toISOString();
  const json = EJSON.stringify({ app: "spinex-website", format: 1, createdAt, database: db.databaseName, note: "Images and API keys are not included.", collections }, { relaxed: false });
  const gz = gzipSync(Buffer.from(json, "utf8"), { level: 9 });
  const stamp = createdAt.slice(0, 16).replace(/[:T]/g, "-");
  return { file: gz, name: `spinex-backup-${stamp}.json.gz`, collections: names.length, documents: count, size: gz.length };
}

const MAX_EMAIL_FILE = 20 * 1024 * 1024; // Gmail allows 25 MB per email

export async function runBackup() {
  const settings = await getAutomation();
  const to = settings.backupEmail || (await smtpSettings()).NOTIFY_EMAIL;
  const b = await createBackup();
  const sizeText = `${(b.size / 1024 / 1024).toFixed(2)} MB`;
  let result: string;
  let ok = false;
  if (!to) result = "No email to send it to (set one here or 'Send alerts to' in API keys)";
  else if (b.size > MAX_EMAIL_FILE) result = `Backup is ${sizeText}, too big to email. Download it from this page instead.`;
  else {
    ok = await emailFile(to, `Website backup ${nowIST().date}`, `Automatic backup of your website database: ${b.collections} collections, ${b.documents} records, ${sizeText}.\n\nKeep this email. To restore, send the file to your developer.`, { filename: b.name, content: b.file, contentType: "application/gzip" });
    result = ok ? `Emailed to ${to} (${sizeText})` : "Email failed. Check API keys → Email alerts.";
  }
  await writeState("automation", { lastBackup: new Date().toISOString(), lastBackupOk: ok, lastBackupResult: result });
  return { ok, result };
}

export function backupDue(settings: AutomationSettings, lastBackup: string) {
  if (settings.backupFrequency === "off") return false;
  const now = nowIST();
  const lastDate = lastBackup ? new Date(new Date(lastBackup).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10) : "";
  if (lastDate === now.date) return false;
  if (settings.backupFrequency === "daily") return true;
  const daysSince = lastBackup ? (Date.now() - new Date(lastBackup).getTime()) / 86400000 : Infinity;
  // Weekly: on the chosen day, or as soon as possible if a whole week was missed.
  return now.weekday === settings.backupWeekday || daysSince >= 7.5;
}


// ---------- Restore ----------

type BackupFile = { app?: string; format?: number; createdAt?: string; collections?: Record<string, unknown[]> };

// Reads a backup file made by createBackup (.json.gz, or plain .json). Throws a readable error for anything else.
export function readBackup(buf: Buffer): { createdAt: string; collections: Record<string, unknown[]> } {
  let text: string;
  try {
    text = (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString("utf8");
  } catch {
    throw new Error("This file couldn't be opened. Choose a backup file (.json.gz) from this website.");
  }
  let data: BackupFile;
  try {
    data = EJSON.parse(text, { relaxed: false }) as BackupFile;
  } catch {
    throw new Error("This isn't a backup file from this website.");
  }
  if (data?.app !== "spinex-website" || !data.collections || typeof data.collections !== "object") {
    throw new Error("This isn't a backup file from this website.");
  }
  const collections: Record<string, unknown[]> = {};
  for (const [name, docs] of Object.entries(data.collections)) {
    if (Array.isArray(docs) && /^[A-Za-z0-9_.-]{1,60}$/.test(name) && !NO_RESTORE(name)) collections[name] = docs;
  }
  return { createdAt: String(data.createdAt || ""), collections };
}

// Keeps a copy of the current database inside the database itself (last 3), taken just before a restore.
async function safetyCopy() {
  const b = await createBackup();
  const bucket = new GridFSBucket(await getDb(), { bucketName: "safety_backups" });
  await new Promise<void>((res, rej) => {
    const up = bucket.openUploadStream(b.name, { metadata: { contentType: "application/gzip" } });
    up.on("error", rej).on("finish", () => res());
    up.end(b.file);
  });
  const old = await bucket.find({}).sort({ uploadDate: -1 }).skip(3).toArray();
  for (const f of old) await bucket.delete(f._id).catch(() => undefined);
  return b.name;
}

export async function listSafetyCopies() {
  const bucket = new GridFSBucket(await getDb(), { bucketName: "safety_backups" });
  return (await bucket.find({}).sort({ uploadDate: -1 }).limit(3).toArray()).map((f) => ({ id: String(f._id), name: f.filename, size: f.length, at: f.uploadDate.toISOString() }));
}

export async function readSafetyCopy(id: string) {
  const { ObjectId } = await import("mongodb");
  if (!ObjectId.isValid(id)) return null;
  const bucket = new GridFSBucket(await getDb(), { bucketName: "safety_backups" });
  const [f] = await bucket.find({ _id: new ObjectId(id) }).toArray();
  if (!f) return null;
  const parts: Buffer[] = [];
  await new Promise<void>((res, rej) => bucket.openDownloadStream(f._id).on("data", (c: Buffer) => parts.push(c)).on("error", rej).on("end", () => res()));
  return { name: f.filename, file: Buffer.concat(parts) };
}

// Replaces the chosen collections with the backup's copy. A safety copy of everything is saved first.
export async function restoreBackup(buf: Buffer, only: string[]) {
  const backup = readBackup(buf);
  const names = Object.keys(backup.collections).filter((n) => only.includes(n));
  if (!names.length) throw new Error("Choose at least one thing to restore.");
  const safety = await safetyCopy();
  const db = await getDb();
  const restored: Record<string, number> = {};
  for (const name of names) {
    const col = db.collection(name);
    let docs = backup.collections[name] as Record<string, unknown>[];
    if (name === "settings") {
      // Keep this website's own job state, the owner's login and previews as they are now.
      docs = docs.filter((d) => !PRIVATE_SETTING(d._id));
      await col.deleteMany({ _id: { $not: /^(state:|owner_account$|content_preview:)/ } } as Record<string, unknown>);
    } else {
      await col.deleteMany({});
    }
    if (docs.length) await col.insertMany(docs, { ordered: false });
    restored[name] = docs.length;
  }
  await writeState("automation", { lastRestore: new Date().toISOString(), lastRestoreResult: `Restored ${names.join(", ")} from the backup of ${backup.createdAt.slice(0, 10)}` });
  return { restored, safety, backupDate: backup.createdAt };
}
