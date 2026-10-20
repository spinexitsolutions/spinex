import { NextResponse } from "next/server";
import { getSession, guard } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";
import { can } from "@/lib/roles";

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
  const deny = await guard("stats");
  if (deny) return deny;
  const s = (await getSession())!;
  const db = await getDb();
  const months = lastMonths(6);
  const since = `${months[0].key}-01`;
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const out: Record<string, unknown> = { months: months.map((m) => m.label) };

  if (can(s.role, "leads")) {
    const leads = await db
      .collection("leads")
      .find({}, { projection: { name: 1, status: 1, source: 1, createdAt: 1, value: 1, followUp: 1, services: 1 } })
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
      latest: leads.slice(0, 5).map((l) => ({ id: String(l._id), name: l.name, status: l.status, source: l.source, createdAt: l.createdAt })),
    };
  }

  if (can(s.role, "people")) {
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

  if (can(s.role, "content")) {
    const posts = db.collection("posts");
    out.content = {
      published: await posts.countDocuments({ status: "published" }),
      drafts: await posts.countDocuments({ status: "draft" }),
      images: await db.collection("uploads.files").countDocuments({}),
    };
  }

  return NextResponse.json(out);
}
