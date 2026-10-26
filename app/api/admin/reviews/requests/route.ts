import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { queueReviewRequest, requestsCol, reviewOid, toRequest } from "@/lib/reviews-db";

// Ask someone for a review now: { name, email, phone, project }.
export async function POST(req: Request) {
  const deny = await guard("reviews");
  if (deny) return deny;
  const b = await jsonBody(req);
  const name = String(b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Add the client's name." }, { status: 400 });
  const session = await getSession();
  const r = await queueReviewRequest({ name, email: String(b.email ?? ""), phone: String(b.phone ?? ""), project: String(b.project ?? ""), source: "manual", by: session?.name ?? "", now: true });
  if (!r.queued) return NextResponse.json({ error: r.reason === "no email" ? "Add a valid email." : r.reason }, { status: 400 });
  const doc = await (await requestsCol()).findOne({ _id: reviewOid(r.id!)! });
  await logActivity(session, "Google reviews", "Asked for a review", name, req);
  return NextResponse.json(toRequest(doc!), { status: 201 });
}
