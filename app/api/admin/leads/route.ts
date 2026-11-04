import { NextResponse } from "next/server";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { cleanLead, leadsCol, toLead } from "@/lib/lead-db";
import { LEAD_SOURCES, MANUAL_SOURCES, type ManualSource } from "@/lib/leads";
import { cleanTrack } from "@/lib/attribution";
import { leadTeam } from "@/lib/team";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const deny = await guard("leads", "view");
  if (deny) return deny;
  const docs = await (await leadsCol()).find().sort({ createdAt: -1 }).limit(3000).toArray();
  return NextResponse.json(docs.map(toLead));
}

// A lead added by hand (phone call, WhatsApp, Instagram DM, referral, walk-in…).
// If another lead already has the same phone number, the answer says so (409) unless "force" is sent.
export async function POST(req: Request) {
  const deny = await guard("leads");
  if (deny) return deny;
  const s = await getSession();
  const b = await jsonBody(req);
  const data = cleanLead(b);
  const name = String(data.name ?? "").trim();
  const phone = String(data.phone ?? "").replace(/[^\d+ ]/g, "").trim();
  if (!name) return NextResponse.json({ error: "Add the person's name." }, { status: 400 });
  if (!phone && !data.email) return NextResponse.json({ error: "Add a phone number or an email." }, { status: 400 });
  const source: ManualSource = (MANUAL_SOURCES as readonly string[]).includes(String(b.source)) ? (String(b.source) as ManualSource) : "other";
  const col = await leadsCol();
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length === 10 && !b.force) {
    const same = await col.findOne({ phone: { $regex: `${digits.split("").join("\\D*")}$` } }, { projection: { name: 1 } });
    if (same) return NextResponse.json({ error: `${String(same.name || "Someone")} with this number is already in Leads.`, duplicate: String(same._id) }, { status: 409 });
  }
  const now = new Date().toISOString();
  const label = LEAD_SOURCES[source];
  const track = { ...cleanTrack({}), channel: label, firstChannel: label, firstAt: now };
  let assignedName = "";
  if (data.assignedTo) assignedName = (await leadTeam()).find((m) => m.id === data.assignedTo)?.name ?? "";
  const doc = {
    name, phone, email: data.email ?? "", services: data.services ?? "", budget: data.budget ?? "", message: data.message ?? "", plan: "",
    source, status: data.status || "new", value: data.value ?? "", followUp: data.followUp ?? "", followUpNote: data.followUpNote ?? "",
    assignedTo: assignedName ? data.assignedTo : "", assignedName, notes: data.notes ?? "", track,
    addedBy: s?.name || s?.email || "", noFollowups: true, createdAt: now, updatedAt: now,
  };
  const { insertedId } = await col.insertOne(doc);
  await logActivity(s, "Leads", `Added a lead by hand (${label})`, name, req);
  return NextResponse.json(toLead({ _id: insertedId, ...doc }), { status: 201 });
}
