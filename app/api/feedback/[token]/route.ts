import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/antispam";
import { saveAnswer } from "@/lib/feedback-db";
import { getReviewSettings } from "@/lib/reviews-db";
import { writeReviewUrl } from "@/lib/reviews";
import { getFeedbackSettings } from "@/lib/feedback-db";

const s = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0009\u000b-\u001f]/g, " ").trim().slice(0, max);

// The client's answer to the feedback form (one answer per link).
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!hasDb()) return NextResponse.json({ error: "Offline right now." }, { status: 503 });
  if (!(req.headers.get("content-type") || "").includes("application/json")) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (await rateLimited(`feedback:${clientIp(req)}`, 20, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many tries. Please wait a while." }, { status: 429 });
  const token = String(params.token || "");
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rating = Math.round(Number(b.rating));
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: "Choose a star rating." }, { status: 400 });
  const f = await saveAnswer(token, {
    rating,
    liked: s(b.liked, 1200),
    better: s(b.better, 1200),
    publish: !!b.publish,
    displayName: s(b.displayName, 80),
    role: s(b.role, 80),
    company: s(b.company, 120),
    at: new Date().toISOString(),
  });
  if (!f) return NextResponse.json({ error: "This feedback was already sent. Thank you!" }, { status: 409 });
  const [rs, fs] = await Promise.all([getReviewSettings(), getFeedbackSettings()]);
  // Everyone is invited to Google (Google doesn't allow asking only happy clients).
  return NextResponse.json({ ok: true, googleUrl: fs.showGoogleAfter ? writeReviewUrl(rs) : "" });
}
