import { NextResponse } from "next/server";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { getProfile } from "@/lib/billing-db";
import { writeSetting } from "@/lib/settings-db";
import { defaultProfile } from "@/lib/billing";
import { safeUrl } from "@/lib/content-sanitize";
import { logActivity } from "@/lib/activity";

// Your business details for quotations and invoices. Anyone who makes quotes can read them; owner and admin can change them.
export async function GET() {
  const deny = await guard("leads");
  if (deny) return deny;
  return NextResponse.json(await getProfile());
}

export async function PUT(req: Request) {
  const deny = await guard("leads");
  if (deny) return deny;
  const s = await getSession();
  if (s?.role !== "owner" && s?.role !== "admin") return NextResponse.json({ error: "Only the owner or an admin can change billing details." }, { status: 403 });
  const b = await jsonBody(req);
  if (typeof b.gstin === "string") b.gstin = b.gstin.trim().toUpperCase();
  if (typeof b.pan === "string") b.pan = b.pan.trim().toUpperCase();
  if ("signers" in b) {
    const list = Array.isArray(b.signers) ? b.signers : [];
    b.signers = list.filter((x) => x && typeof x === "object").slice(0, 6).map((x, i) => {
      const r = x as Record<string, unknown>;
      return {
        id: String(r.id ?? "").replace(/[^\w-]/g, "").slice(0, 40) || `s${Date.now()}${i}`,
        name: String(r.name ?? "").trim().slice(0, 80),
        title: String(r.title ?? "").trim().slice(0, 80),
        image: safeUrl(r.image),
        show: !!r.show,
      };
    });
  }
  const saved = await writeSetting("billing", defaultProfile, b);
  await logActivity(s, "Invoices", "Changed billing details (bank, GSTIN, signatures…)", "", req);
  return NextResponse.json(saved);
}
