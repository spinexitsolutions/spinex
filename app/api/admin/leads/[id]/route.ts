import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { oid } from "@/lib/intern-db";
import { cleanLead, leadsCol, toLead } from "@/lib/lead-db";
import { getSession } from "@/lib/admin-guard";
import { leadTeam } from "@/lib/team";
import { emailPerson } from "@/lib/notify";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("leads");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  const data = cleanLead(await jsonBody(req));
  if (data.name === "") return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
  const col = await leadsCol();
  const before = await col.findOne({ _id });
  if (!before) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  // Giving the lead to someone: check they are on the team and keep their name with the lead.
  let assignee: Awaited<ReturnType<typeof leadTeam>>[number] | undefined;
  const update: Record<string, string> = { ...data };
  if ("assignedTo" in data) {
    if (data.assignedTo) {
      assignee = (await leadTeam()).find((m) => m.id === data.assignedTo);
      if (!assignee) return NextResponse.json({ error: "That team member wasn't found." }, { status: 400 });
      update.assignedName = assignee.name;
    } else update.assignedName = "";
  }
  const doc = await col.findOneAndUpdate({ _id }, { $set: { ...update, updatedAt: new Date().toISOString() } }, { returnDocument: "after" });
  if (!doc) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  const lead = toLead(doc);

  // Tell the new person, unless they gave it to themselves.
  const me = await getSession();
  if (assignee && assignee.id !== String(before.assignedTo ?? "") && assignee.id !== me?.uid && assignee.email) {
    const origin = new URL(req.url).origin;
    await emailPerson(
      assignee.email,
      `Lead assigned to you: ${lead.name}`,
      `${me?.name || "Someone"} gave you a lead`,
      [
        `Name: ${lead.name}\nPhone: ${lead.phone}${lead.email ? `\nEmail: ${lead.email}` : ""}${lead.services ? `\nNeeds: ${lead.services}` : ""}`,
        lead.followUp ? `Follow up on ${lead.followUp}${lead.followUpNote ? `: ${lead.followUpNote}` : ""}.` : "No follow-up date set yet.",
      ],
      { label: "Open leads", url: `${origin}/admin#leads` },
    ).catch(() => false);
  }
  return NextResponse.json(lead);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const deny = await guard("leads");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  await (await leadsCol()).deleteOne({ _id });
  return NextResponse.json({ ok: true });
}
