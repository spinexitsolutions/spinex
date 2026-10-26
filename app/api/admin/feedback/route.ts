import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { cleanFeedbackSettings } from "@/lib/feedback";
import { feedbackCol, getFeedbackSettings, saveFeedbackSettings, toFeedback } from "@/lib/feedback-db";
import { can } from "@/lib/roles";

export async function GET() {
  const deny = await guard("reviews", "view");
  if (deny) return deny;
  const [settings, docs] = await Promise.all([getFeedbackSettings(), (await feedbackCol()).find({}).sort({ createdAt: -1 }).limit(500).toArray()]);
  const list = docs.map(toFeedback);
  const answered = list.filter((f) => f.response);
  const avg = answered.length ? answered.reduce((s, f) => s + (f.response?.rating ?? 0), 0) / answered.length : 0;
  return NextResponse.json({ settings, list, stats: { asked: list.filter((f) => f.status !== "cancelled").length, answered: answered.length, avg: Math.round(avg * 10) / 10, waitingApproval: answered.filter((f) => f.approval === "pending" && f.response?.publish && f.response.liked).length }, canEdit: can(await getSession(), "leads", "edit") });
}

export async function PUT(req: Request) {
  const deny = await guard("reviews");
  if (deny) return deny;
  const next = cleanFeedbackSettings(await jsonBody(req));
  await saveFeedbackSettings(next);
  await logActivity(await getSession(), "Client feedback", "Changed feedback settings", "", req);
  return NextResponse.json(next);
}
