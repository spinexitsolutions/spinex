import { guard } from "@/lib/admin-guard";
import { clientsCol, ticketsCol, toClient } from "@/lib/portal-db";
import type { PortalClient } from "@/lib/portal";

// All portal clients as a spreadsheet (CSV, opens in Excel and Google Sheets). Admin → Clients and portal → Download Excel.
export async function GET() {
  const deny = await guard("clients", "view");
  if (deny) return deny;
  const [docs, open] = await Promise.all([
    (await clientsCol()).find({}).sort({ createdAt: -1 }).toArray(),
    (await ticketsCol()).aggregate<{ _id: string; open: number }>([{ $match: { status: { $ne: "closed" } } }, { $group: { _id: "$clientId", open: { $sum: 1 } } }]).toArray(),
  ]);
  const openBy = new Map(open.map((o) => [o._id, o.open]));
  const day = (v: string) => (v ? v.slice(0, 10) : "");
  const status: Record<string, string> = { active: "In progress", "on-hold": "On hold", completed: "Completed" };
  const cols: [string, (c: PortalClient) => unknown][] = [
    ["Added on", (c) => day(c.createdAt)],
    ["Name", (c) => c.name],
    ["Company", (c) => c.company],
    ["Email", (c) => c.email],
    ["Phone", (c) => c.phone],
    ["Can log in", (c) => (c.active ? "Yes" : "No")],
    ["Invited on", (c) => day(c.invitedAt)],
    ["Last login", (c) => day(c.lastLoginAt)],
    ["Projects", (c) => c.projects.length],
    ["Project list", (c) => c.projects.map((p) => `${p.title} (${status[p.status] ?? p.status})`).join("; ")],
    ["Current stage", (c) => c.projects.filter((p) => p.status !== "completed").map((p) => `${p.title}: ${p.stages.find((s) => s.status === "current")?.title ?? "-"}`).join("; ")],
    ["Target dates", (c) => c.projects.filter((p) => p.dueDate).map((p) => `${p.title}: ${p.dueDate}`).join("; ")],
    ["AMC plans", (c) => c.amcs.map((a) => `${a.title} (${a.startDate} to ${a.endDate}, ₹${a.amount})`).join("; ")],
    ["Open support requests", (c) => openBy.get(c.id) ?? 0],
    ["Private notes", (c) => c.notes],
  ];
  // A leading ' stops Excel / Sheets from running a value like =HYPERLINK(...) as a formula.
  const esc = (v: unknown) => `"${String(v ?? "").replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
  const rows = docs.map(toClient).map((c) => cols.map(([, f]) => esc(f(c))).join(","));
  const csv = "﻿" + [cols.map(([h]) => esc(h)).join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="spinex-clients-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
