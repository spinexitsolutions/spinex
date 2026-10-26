import { NextResponse } from "next/server";
import type { Collection, Document } from "mongodb";
import { getSession } from "@/lib/admin-guard";
import { getDb, hasDb } from "@/lib/db";
import { can, type Perm } from "@/lib/roles";
import { todayIST } from "@/lib/billing";

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

// For the admin sidebar: how many things wait in each section, and a marker that changes whenever
// something in it changes, so the open screen can refresh itself without a page reload.
export async function GET() {
  if (!hasDb()) return NextResponse.json({});
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const db = await getDb();
  const today = todayIST();
  const now = new Date().toISOString();
  const jobs: Record<string, [Perm, () => Promise<{ count: number; stamp: string }>]> = {
    leads: ["leads", async () => {
      const c = db.collection("leads");
      const [count, s] = await Promise.all([c.countDocuments({ status: "new" }), stamp(c)]);
      return { count, stamp: `${s}|${count}` };
    }],
    bookings: ["bookings", async () => {
      const c = db.collection("bookings");
      const [count, s] = await Promise.all([c.countDocuments({ status: "confirmed", start: { $gt: now } }), stamp(c)]);
      return { count, stamp: `${s}|${count}` };
    }],
    clients: ["clients", async () => {
      const t = db.collection("portal_tickets");
      const [count, s1, s2] = await Promise.all([t.countDocuments({ teamUnread: true, status: { $ne: "closed" } }), stamp(t), stamp(db.collection("portal_clients"))]);
      return { count, stamp: `${s1}|${s2}|${count}` };
    }],
    attendance: ["payroll", async () => {
      const c = db.collection("leaves");
      const [count, s] = await Promise.all([c.countDocuments({ status: "pending" }), stamp(c)]);
      return { count, stamp: `${s}|${count}` };
    }],
    billing: ["billing", async () => {
      const c = db.collection("billing");
      const [count, s] = await Promise.all([c.countDocuments({ type: "invoice", status: { $in: ["unpaid", "partly-paid"] }, dueDate: { $gt: "", $lt: today } }), stamp(c)]);
      return { count, stamp: `${s}|${count}` };
    }],
    feedback: ["reviews", async () => {
      const c = db.collection("feedback");
      const [count, answered, s] = await Promise.all([c.countDocuments({ status: "answered", approval: "pending", "response.publish": true, "response.rating": { $gte: 4 } }), c.countDocuments({ status: "answered" }), stamp(c)]);
      return { count, stamp: `${s}|${count}|${answered}` };
    }],
    reviews: ["reviews", async () => {
      const c = db.collection("review_requests");
      const [clicked, s] = await Promise.all([c.countDocuments({ status: "clicked" }), stamp(c)]);
      return { count: 0, stamp: `${s}|${clicked}` };
    }],
    interns: ["people", async () => {
      const c = db.collection("interns");
      const [count, s] = await Promise.all([c.countDocuments({ status: "applied" }), stamp(c)]);
      return { count, stamp: `${s}|${count}` };
    }],
  };
  const out: Record<string, { count: number; stamp: string }> = {};
  await Promise.all(Object.entries(jobs).filter(([, [perm]]) => can(me, perm, "view")).map(async ([k, [, fn]]) => {
    out[k] = await fn().catch(() => ({ count: 0, stamp: "" }));
  }));
  return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
}
