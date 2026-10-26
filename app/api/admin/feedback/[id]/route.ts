import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { ContentConflictError } from "@/lib/content-server";
import { fbOid, feedbackCol, publishTestimonial, sendFeedbackRequest, toFeedback, unpublishTestimonial } from "@/lib/feedback-db";

// { action: "approve", quote } puts it in Testimonials; "unpublish" takes it off; "hide" keeps it private;
// "send" sends a waiting request now; "cancel" stops it.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("reviews");
  if (deny) return deny;
  const _id = fbOid(params.id);
  const col = await feedbackCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const f = toFeedback(doc);
  const b = await jsonBody(req);
  const session = await getSession();
  const by = session?.name ?? "Team";
  try {
    if (b.action === "approve") {
      if (!f.response) return NextResponse.json({ error: "No answer yet." }, { status: 400 });
      if (!f.response.publish) return NextResponse.json({ error: "The client didn't agree to show it on the website." }, { status: 400 });
      const quote = String(b.quote ?? f.quote ?? f.response.liked).trim();
      if (quote.length < 10) return NextResponse.json({ error: "Add the text to show (at least a sentence)." }, { status: 400 });
      const tid = await publishTestimonial(f, quote, by);
      await col.updateOne({ _id }, { $set: { approval: "approved", testimonialId: tid, quote } });
      await logActivity(session, "Client feedback", "Added client feedback to Testimonials", f.name, req);
    } else if (b.action === "unpublish" || b.action === "hide") {
      if (f.testimonialId) await unpublishTestimonial(f.testimonialId, by);
      await col.updateOne({ _id }, { $set: { approval: b.action === "hide" ? "hidden" : "pending", testimonialId: "" } });
    } else if (b.action === "send" && (f.status === "scheduled" || f.status === "failed")) {
      if (!(await sendFeedbackRequest({ ...f, status: "scheduled" }, false))) return NextResponse.json({ error: "The email couldn't be sent. Check API keys → Email alerts." }, { status: 502 });
    } else if (b.action === "cancel" && f.status === "scheduled") {
      await col.updateOne({ _id }, { $set: { status: "cancelled" } });
    } else return NextResponse.json({ error: "That can't be done now." }, { status: 400 });
  } catch (e) {
    if (e instanceof ContentConflictError) return NextResponse.json({ error: "Website content was just changed by someone else. Try again." }, { status: 409 });
    throw e;
  }
  return NextResponse.json(toFeedback((await col.findOne({ _id }))!));
}
