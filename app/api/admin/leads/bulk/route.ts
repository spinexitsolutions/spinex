import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { leadsCol } from "@/lib/lead-db";
import { LEAD_STATUSES, LOST_REASONS } from "@/lib/leads";
import { leadTeam } from "@/lib/team";
import { logActivity } from "@/lib/activity";

// Several leads at once: { ids, status?, lostReason?, assignedTo?, delete? }.
export async function POST(req: Request) {
  const deny = await guard("leads");
  if (deny) return deny;
  const b = await jsonBody(req);
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).filter((x) => ObjectId.isValid(x)).slice(0, 500).map((x) => new ObjectId(x));
  if (!ids.length) return NextResponse.json({ error: "Pick at least one lead." }, { status: 400 });
  const col = await leadsCol();
  const s = await getSession();
  if (b.delete === true) {
    const r = await col.deleteMany({ _id: { $in: ids } });
    await logActivity(s, "Leads", `Deleted ${r.deletedCount} lead${r.deletedCount === 1 ? "" : "s"} at once`, "", req);
    return NextResponse.json({ ok: true, deleted: r.deletedCount });
  }
  const set: Record<string, string> = { updatedAt: new Date().toISOString() };
  const what: string[] = [];
  const status = typeof b.status === "string" ? b.status : "";
  const assignTo = typeof b.assignedTo === "string" ? b.assignedTo : null;
  if (status && (LEAD_STATUSES as readonly string[]).includes(status)) {
    set.status = status;
    what.push(`status → ${status}`);
    if (status === "lost") set.lostReason = (LOST_REASONS as readonly string[]).includes(String(b.lostReason)) ? String(b.lostReason) : "Other";
  }
  if (assignTo !== null) {
    if (assignTo) {
      const m = (await leadTeam()).find((x) => x.id === assignTo);
      if (!m) return NextResponse.json({ error: "That team member wasn't found." }, { status: 400 });
      set.assignedTo = m.id;
      set.assignedName = m.name;
      what.push(`given to ${m.name}`);
    } else {
      set.assignedTo = "";
      set.assignedName = "";
      what.push("un-assigned");
    }
  }
  if (!what.length) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  const r = await col.updateMany({ _id: { $in: ids } }, { $set: set });
  await logActivity(s, "Leads", `Updated ${r.modifiedCount} leads at once: ${what.join(", ")}`, "", req);
  return NextResponse.json({ ok: true, updated: r.modifiedCount });
}
