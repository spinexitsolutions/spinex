import { NextResponse } from "next/server";
import { getSession, guard } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";
import { can } from "@/lib/roles";
import { billingCol, getProfile, toBill } from "@/lib/billing-db";
import { computeTotals } from "@/lib/billing";
import { getAutomation } from "@/lib/automation";

type Month = { key: string; label: string };

function lastMonths(n: number): Month[] {
  const out: Month[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`, label: m.toLocaleString("en-IN", { month: "short" }) });
  }
  return out;
}

const countBy = <T,>(rows: T[], key: (r: T) => string) =>
  rows.reduce<Record<string, number>>((acc, r) => {
    const k = key(r) || "other";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

// Numbers for the admin dashboard. Each part is only included if the user's role can see it.
export async function GET() {
  const deny = await guard("stats", "view");
  if (deny) return deny;
  const s = (await getSession())!;
  const db = await getDb();
  const months = lastMonths(6);
  const since = `${months[0].key}-01`;
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const out: Record<string, unknown> = { months: months.map((m) => m.label) };

  if (can(s, "leads", "view")) {
    const unrepliedHours = (await getAutomation()).unrepliedHours || 2;
    const leads = await db
      .collection("leads")
      .find({}, { projection: { name: 1, status: 1, source: 1, createdAt: 1, updatedAt: 1, value: 1, followUp: 1, services: 1 } })
      .sort({ createdAt: -1 })
      .limit(5000)
      .toArray();
    const recent = leads.filter((l) => String(l.createdAt) >= since);
    out.leads = {
      total: leads.length,
      newThisWeek: leads.filter((l) => String(l.createdAt) >= weekAgo).length,
      byStatus: countBy(leads, (l) => String(l.status)),
      bySource: countBy(leads, (l) => String(l.source)),
      perMonth: months.map((m) => ({
        all: recent.filter((l) => String(l.createdAt).startsWith(m.key)).length,
        won: recent.filter((l) => String(l.createdAt).startsWith(m.key) && l.status === "won").length,
      })),
      wonValue: leads.filter((l) => l.status === "won").reduce((n, l) => n + (Number(l.value) || 0), 0),
      followUpsDue: leads.filter((l) => l.followUp && l.followUp <= today && l.status !== "won" && l.status !== "lost").length,
      topServices: Object.entries(
        countBy(
          leads.flatMap((l) => String(l.services || "").split(",").map((x) => x.trim()).filter(Boolean)),
          (x: string) => x,
        ),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      // "This week" report: the last 7 days next to the 7 days before.
      week: (() => {
        const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
        const waitCut = new Date(Date.now() - unrepliedHours * 3600e3).toISOString();
        const thisWeek = leads.filter((l) => String(l.createdAt) >= weekAgo);
        const lastWeek = leads.filter((l) => String(l.createdAt) >= twoWeeksAgo && String(l.createdAt) < weekAgo);
        const wonNow = leads.filter((l) => l.status === "won" && String(l.updatedAt || l.createdAt) >= weekAgo);
        const wonBefore = leads.filter((l) => l.status === "won" && String(l.updatedAt || l.createdAt) >= twoWeeksAgo && String(l.updatedAt || l.createdAt) < weekAgo);
        return {
          leads: thisWeek.length,
          leadsBefore: lastWeek.length,
          won: wonNow.length,
          wonBefore: wonBefore.length,
          wonValue: wonNow.reduce((n, l) => n + (Number(l.value) || 0), 0),
          answered: thisWeek.filter((l) => l.status !== "new").length,
          waiting: leads.filter((l) => l.status === "new" && String(l.createdAt) <= waitCut).length,
          waitHours: unrepliedHours,
          bySource: Object.entries(countBy(thisWeek, (l) => String(l.source))).sort((a, b) => b[1] - a[1]),
        };
      })(),
      latest: leads.slice(0, 5).map((l) => ({ id: String(l._id), name: l.name, status: l.status, source: l.source, createdAt: l.createdAt })),
    };
  }

  if (can(s, "people", "view")) {
    const people = await db.collection("interns").find({}, { projection: { status: 1, createdAt: 1, certId: 1, kind: 1 } }).limit(5000).toArray();
    const interns = people.filter((p) => p.kind !== "job");
    out.people = {
      interns: interns.length,
      jobApplicants: people.length - interns.length,
      byStatus: countBy(interns, (p) => String(p.status)),
      certificates: interns.filter((p) => p.certId).length,
      perMonth: months.map((m) => people.filter((p) => String(p.createdAt).startsWith(m.key)).length),
    };
  }

  if (can(s, "content", "view") || can(s, "blog", "view") || can(s, "media", "view")) {
    const posts = db.collection("posts");
    out.content = {
      published: await posts.countDocuments({ status: "published" }),
      drafts: await posts.countDocuments({ status: "draft" }),
      images: await db.collection("uploads.files").countDocuments({}),
    };
  }

  // "Today's work" at the top of the overview: what needs attention now.
  const todayIst = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const work: Record<string, unknown> = {};
  if (can(s, "leads", "view")) {
    const leadsCol = db.collection("leads");
    work.newLeads = await leadsCol.countDocuments({ status: "new" });
    work.followUps = await leadsCol.countDocuments({ followUp: { $gt: "", $lte: todayIst }, status: { $nin: ["won", "lost"] } });
  }
  if (can(s, "bookings", "view")) {
    const calls = await db.collection("bookings").find({ date: todayIst, status: "confirmed" }, { projection: { time: 1, name: 1 } }).sort({ time: 1 }).limit(20).toArray();
    work.callsToday = calls.length;
    work.nextCall = calls[0] ? { time: String(calls[0].time ?? ""), name: String(calls[0].name ?? "") } : null;
  }
  if (can(s, "billing", "view")) {
    const docs = await (await billingCol()).find({ type: "invoice", status: { $in: ["unpaid", "partly-paid"] } }).limit(2000).toArray();
    const profile = await getProfile();
    let due = 0;
    let overdue = 0;
    for (const d of docs) {
      const b = toBill(d);
      const bal = computeTotals(b, profile).balance;
      due += bal;
      if (b.dueDate && b.dueDate < todayIst && bal > 0) overdue++;
    }
    work.unpaid = Math.round(due);
    work.unpaidCount = docs.length;
    work.overdue = overdue;
  }
  if (can(s, "clients", "view")) {
    work.openRequests = await db.collection("portal_tickets").countDocuments({ status: { $ne: "closed" } });
  }
  out.today = work;

  return NextResponse.json(out);
}
