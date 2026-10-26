import { NextResponse } from "next/server";
import type { Collection, Document } from "mongodb";
import { getSession } from "@/lib/admin-guard";
import { getDb, hasDb } from "@/lib/db";
import { can, type Perm } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Latest change in a collection: newest edit or newest new record (whichever is later), plus how many records there are.
async function stamp(col: Collection<Document>, filter: Document = {}) {
  const [byEdit, byNew, n] = await Promise.all([
    col.find(filter, { projection: { updatedAt: 1, createdAt: 1 } }).sort({ updatedAt: -1 }).limit(1).toArray(),
    col.find(filter, { projection: { _id: 1 } }).sort({ _id: -1 }).limit(1).toArray(),
    col.estimatedDocumentCount(),
  ]);
  return `${n}|${String(byEdit[0]?.updatedAt ?? byEdit[0]?.createdAt ?? "")}|${String(byNew[0]?._id ?? "")}`;
}

// Each team member's "last looked at" time per section. A section's number counts only what came in after that,
// like unread messages: open the section and its number goes away.
const seenCol = async () => (await getDb()).collection<{ _id: string; value?: Record<string, string> }>("settings");
const seenId = (uid: string) => `seen:${uid || "owner"}`;

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ ok: false });
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { section?: unknown };
  const section = String(b.section ?? "");
  if (!/^[a-z]{2,20}$/.test(section)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  await (await seenCol()).updateOne({ _id: seenId(me.uid) }, { $set: { [`value.${section}`]: new Date().toISOString() } }, { upsert: true });
  return NextResponse.json({ ok: true });
}

// For the admin sidebar: what's new in each section since this person last opened it, and a marker that changes
// whenever something in it changes, so the open screen can refresh itself without a page reload.
export async function GET() {
  if (!hasDb()) return NextResponse.json({});
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const db = await getDb();
  const now = new Date().toISOString();
  const seenDoc = await (await seenCol()).findOne({ _id: seenId(me.uid) });
  const seen: Record<string, string> = { ...(seenDoc?.value ?? {}) };
  const fresh: Record<string, string> = {};
  // First time: start counting from now, so old records don't show as new.
  const since = (k: string) => {
    if (!seen[k]) { seen[k] = now; fresh[`value.${k}`] = now; }
    return seen[k];
  };
  const jobs: Record<string, [Perm, () => Promise<{ count: number; stamp: string }>]> = {
    leads: ["leads", async () => {
      const c = db.collection("leads");
      const [count, s] = await Promise.all([c.countDocuments({ createdAt: { $gt: since("leads") } }), stamp(c)]);
      return { count, stamp: s };
    }],
    bookings: ["bookings", async () => {
      const c = db.collection("bookings");
      const [count, s] = await Promise.all([c.countDocuments({ createdAt: { $gt: since("bookings") } }), stamp(c)]);
      return { count, stamp: s };
    }],
    clients: ["clients", async () => {
      const t = db.collection("portal_tickets");
      const [count, s1, s2] = await Promise.all([t.countDocuments({ teamUnread: true, updatedAt: { $gt: since("clients") } }), stamp(t), stamp(db.collection("portal_clients"))]);
      return { count, stamp: `${s1}|${s2}` };
    }],
    attendance: ["payroll", async () => {
      const c = db.collection("leaves");
      const [count, s] = await Promise.all([c.countDocuments({ status: "pending", createdAt: { $gt: since("attendance") } }), stamp(c)]);
      return { count, stamp: s };
    }],
    billing: ["billing", async () => {
      const c = db.collection("billing");
      const t = since("billing");
      // Something the client did: accepted a quotation, asked for changes, or paid online.
      const [count, s] = await Promise.all([c.countDocuments({ $or: [{ "acceptance.at": { $gt: t } }, { changes: { $elemMatch: { at: { $gt: t } } } }, { onlinePayments: { $elemMatch: { at: { $gt: t } } } }] }), stamp(c)]);
      return { count, stamp: s };
    }],
    feedback: ["reviews", async () => {
      const c = db.collection("feedback");
      const [count, answered, s] = await Promise.all([c.countDocuments({ "response.at": { $gt: since("feedback") } }), c.countDocuments({ status: "answered" }), stamp(c)]);
      return { count, stamp: `${s}|${answered}` };
    }],
    reviews: ["reviews", async () => {
      const c = db.collection("review_requests");
      const [count, clicked, s] = await Promise.all([c.countDocuments({ clickedAt: { $gt: since("reviews") } }), c.countDocuments({ status: "clicked" }), stamp(c)]);
      return { count, stamp: `${s}|${clicked}` };
    }],
    interns: ["people", async () => {
      const c = db.collection("interns");
      const [count, s] = await Promise.all([c.countDocuments({ createdAt: { $gt: since("interns") } }), stamp(c)]);
      return { count, stamp: s };
    }],
  };
  const out: Record<string, { count: number; stamp: string }> = {};
  await Promise.all(Object.entries(jobs).filter(([, [perm]]) => can(me, perm, "view")).map(async ([k, [, fn]]) => {
    out[k] = await fn().catch(() => ({ count: 0, stamp: "" }));
  }));
  if (Object.keys(fresh).length) await (await seenCol()).updateOne({ _id: seenId(me.uid) }, { $set: fresh }, { upsert: true });
  return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
}
