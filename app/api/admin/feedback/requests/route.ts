import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { fbOid, feedbackCol, queueFeedback, toFeedback } from "@/lib/feedback-db";

// Ask someone for feedback now: { name, email, phone, project }.
export async function POST(req: Request) {
  const deny = await guard("leads");
  if (deny) return deny;
  const b = await jsonBody(req);
  const name = String(b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Add the client's name." }, { status: 400 });
  const session = await getSession();
  const r = await queueFeedback({ name, company: String(b.company ?? ""), email: String(b.email ?? ""), phone: String(b.phone ?? ""), project: String(b.project ?? ""), source: "manual", by: session?.name ?? "", now: true });
  if (!r.queued) return NextResponse.json({ error: r.reason === "no email" ? "Add a valid email." : r.reason }, { status: 400 });
  await logActivity(session, "Client feedback", "Asked for feedback", name, req);
  return NextResponse.json(toFeedback((await (await feedbackCol()).findOne({ _id: fbOid(r.id!)! }))!), { status: 201 });
}
