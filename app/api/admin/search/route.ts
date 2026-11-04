import { NextResponse } from "next/server";
import { getSession } from "@/lib/admin-guard";
import { can } from "@/lib/roles";
import { hasDb } from "@/lib/db";
import { leadsCol } from "@/lib/lead-db";
import { clientsCol } from "@/lib/portal-db";
import { billingCol } from "@/lib/billing-db";

type Hit = { kind: "lead" | "client" | "bill"; id: string; title: string; sub: string; href: string };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// One search box for the whole admin: leads, clients, and quotes/invoices.
// Only shows what the signed-in person is allowed to see.
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!hasDb()) return NextResponse.json([]);
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json([]);
  const rx = new RegExp(esc(q), "i");
  const digits = q.replace(/\D/g, "");
  const phoneRx = digits.length >= 4 ? new RegExp(digits.split("").map(esc).join("\\D*")) : null;
  const or = (fields: string[]) => {
    const list: Record<string, unknown>[] = fields.map((f) => ({ [f]: rx }));
    if (phoneRx) list.push({ phone: phoneRx }, { "client.phone": phoneRx });
    return { $or: list };
  };
  const out: Hit[] = [];
  const jobs: Promise<void>[] = [];
  if (can(s, "leads", "view")) {
    jobs.push((async () => {
      const docs = await (await leadsCol()).find(or(["name", "email", "company", "services", "message"]), { projection: { name: 1, phone: 1, email: 1, services: 1, status: 1 } }).sort({ createdAt: -1 }).limit(6).toArray();
      for (const d of docs) out.push({ kind: "lead", id: String(d._id), title: String(d.name || "Lead"), sub: [d.phone, d.services, d.status].filter(Boolean).join(" · "), href: `/admin#leads` });
    })());
  }
  if (can(s, "clients", "view")) {
    jobs.push((async () => {
      const docs = await (await clientsCol()).find(or(["name", "email", "company"]), { projection: { name: 1, company: 1, phone: 1, email: 1 } }).sort({ createdAt: -1 }).limit(5).toArray();
      for (const d of docs) out.push({ kind: "client", id: String(d._id), title: String(d.name || d.company || "Client"), sub: [d.company, d.phone || d.email].filter(Boolean).join(" · "), href: `/admin/clients/${d._id}` });
    })());
  }
  if (can(s, "billing", "view")) {
    jobs.push((async () => {
      const docs = await (await billingCol()).find(or(["number", "client.name", "client.company", "client.email"]), { projection: { number: 1, type: 1, status: 1, client: 1 } }).sort({ date: -1 }).limit(5).toArray();
      for (const d of docs) {
        const c = (d.client ?? {}) as { name?: string; company?: string };
        out.push({ kind: "bill", id: String(d._id), title: String(d.number || (d.type === "invoice" ? "Invoice" : "Quotation")), sub: [c.company || c.name, d.status].filter(Boolean).join(" · "), href: `/admin/billing/${d._id}` });
      }
    })());
  }
  await Promise.all(jobs.map((j) => j.catch(() => undefined)));
  return NextResponse.json(out);
}
