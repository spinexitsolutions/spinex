// Server only. HR letters in the "letters" collection.
import { randomBytes, randomInt } from "crypto";
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "./db";
import { readSetting } from "./settings-db";
import { getProfile } from "./billing-db";
import { SITE_URL } from "./site";
import {
  LETTER_TEMPLATES, SALUTATIONS, blankPerson, defaultLayout, defaultLetterSettings, templateFor,
  type Letter, type Letterhead, type LetterSettings, type LetterStatus, type SalaryRow,
} from "./letters";

export const lettersCol = async () => (await getDb()).collection("letters");
export const letterOid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
export const newLetterToken = () => randomBytes(18).toString("base64url");

// SPX-L-7KQ2X9: no 0/O or 1/I, so it is easy to type from paper.
export function newVerifyCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[randomInt(abc.length)];
  return `SPX-L-${s}`;
}

export function toLetter(doc: WithId<Document>): Letter {
  const { _id, ...r } = doc as WithId<Document> & Partial<Letter>;
  return {
    id: String(_id),
    type: r.type && LETTER_TEMPLATES[r.type] ? r.type : "job_offer",
    number: r.number ?? "",
    verifyCode: r.verifyCode ?? "",
    status: (["draft", "issued", "revoked"] as LetterStatus[]).includes(r.status as LetterStatus) ? (r.status as LetterStatus) : "draft",
    date: r.date ?? "",
    person: { ...blankPerson(), ...(r.person ?? {}) },
    fields: { ...(r.fields ?? {}) },
    subject: r.subject ?? "",
    body: r.body ?? "",
    salary: Array.isArray(r.salary) ? r.salary : [],
    signers: Array.isArray(r.signers) ? r.signers : null,
    layout: r.layout === "certificate" || r.layout === "letter" ? r.layout : defaultLayout(String(r.type ?? "")),
    internId: r.internId ?? "",
    token: r.token ?? "",
    issuedAt: r.issuedAt ?? "",
    sentAt: r.sentAt ?? "",
    createdBy: r.createdBy ?? "",
    createdAt: r.createdAt ?? "",
    updatedAt: r.updatedAt ?? "",
  };
}

const s = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const date = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");

// What the editor may change. Number, verify code, token and status changes go through their own steps.
export function cleanLetterInput(input: Record<string, unknown>) {
  const out: Partial<Letter> = {};
  if (input.date !== undefined) out.date = date(input.date);
  if (input.person && typeof input.person === "object") {
    const p = input.person as Record<string, unknown>;
    out.person = {
      salutation: SALUTATIONS.includes(String(p.salutation ?? "")) ? String(p.salutation ?? "") : "",
      name: s(p.name, 120),
      email: s(p.email, 160),
      phone: s(p.phone, 30),
      address: s(p.address, 500),
      employeeId: s(p.employeeId, 40),
    };
  }
  if (input.fields && typeof input.fields === "object" && !Array.isArray(input.fields)) {
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.fields as Record<string, unknown>).slice(0, 60)) {
      if (/^\w{1,40}$/.test(k)) fields[k] = s(v, 3000);
    }
    out.fields = fields;
  }
  if (input.subject !== undefined) out.subject = s(input.subject, 200);
  if (input.body !== undefined) out.body = s(input.body, 20000);
  if (Array.isArray(input.salary)) {
    out.salary = (input.salary as Record<string, unknown>[]).slice(0, 20).map((r, i): SalaryRow => ({
      id: s(r?.id, 20) || `r${i}`,
      label: s(r?.label, 80),
      monthly: Math.max(0, Math.min(1e9, Math.round(Number(r?.monthly) || 0))),
    }));
  }
  if (input.layout === "certificate" || input.layout === "letter") out.layout = input.layout;
  if (input.signers === null) out.signers = null;
  else if (Array.isArray(input.signers)) out.signers = input.signers.map((x) => s(x, 40)).filter(Boolean).slice(0, 6);
  return out;
}

export async function getLetterSettings(): Promise<LetterSettings> {
  const raw = await readSetting<LetterSettings>("letters", defaultLetterSettings);
  const wording: LetterSettings["wording"] = {};
  for (const [k, v] of Object.entries(raw.wording ?? {})) {
    if (LETTER_TEMPLATES[k] && v && typeof v === "object") wording[k] = { subject: s((v as { subject?: string }).subject, 200), body: String((v as { body?: string }).body ?? "").slice(0, 20000) };
  }
  return { prefix: (raw.prefix || "SPX").replace(/[^A-Za-z0-9-]/g, "").slice(0, 12) || "SPX", wording };
}

export async function saveLetterSettings(next: LetterSettings) {
  await (await getDb()).collection<{ _id: string }>("settings").updateOne(
    { _id: "letters" },
    { $set: { value: next, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
}

// The wording a new letter starts with: the saved default for this type, else the built-in one.
export function startingWording(type: string, settings: LetterSettings) {
  const saved = settings.wording[type];
  const t = templateFor(type);
  return { subject: saved?.subject || t.subject, body: saved?.body || t.body };
}

// SPX/OL/2026/001. One counter per type and year, so numbers never repeat.
export async function nextLetterNumber(type: string, onDate: string, prefix: string) {
  const year = (onDate || new Date().toISOString()).slice(0, 4);
  const code = templateFor(type).code;
  const counters = (await getDb()).collection<{ _id: string; seq: number }>("counters");
  const bump = () => counters.findOneAndUpdate({ _id: `letter:${code}:${year}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  const res = await bump().catch((e) => {
    if ((e as { code?: number }).code === 11000) return bump();
    throw e;
  });
  return `${prefix}/${code}/${year}/${String(res?.seq ?? 1).padStart(3, "0")}`;
}

// Company details printed at the top of every letter (taken from Billing details).
export async function getLetterhead(): Promise<Letterhead> {
  const p = await getProfile();
  return {
    legalName: p.legalName,
    address: p.address,
    phone: p.phone,
    email: p.email,
    website: p.website,
    gstin: p.gstin,
    signers: (Array.isArray(p.signers) ? p.signers : []).filter((x) => x && x.id),
  };
}

// Verify address printed on letters. While the certificate setting is still the old built-in one,
// use this website's own address (NEXT_PUBLIC_SITE_URL), so letters follow a domain change.
export function letterVerifyBase(saved: string | undefined) {
  const v = String(saved ?? "").trim();
  return !v || v === "spinexwebsolutions.in/verify" || v === "spinexitsolutions.com/verify" ? `${SITE_URL}/verify` : v;
}
