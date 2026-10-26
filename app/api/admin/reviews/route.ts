import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { cleanReviewSettings, writeReviewUrl } from "@/lib/reviews";
import { getReviewSettings, googleData, requestsCol, saveReviewSettings, toRequest } from "@/lib/reviews-db";
import { getSecret } from "@/lib/secrets";
import { readState } from "@/lib/settings-db";
import { can } from "@/lib/roles";

export async function GET() {
  const deny = await guard("leads", "view");
  if (deny) return deny;
  const [settings, cache, key, reqs] = await Promise.all([getReviewSettings(), readState("reviews_cache"), getSecret("GOOGLE_PLACES_API_KEY"), (await requestsCol()).find({}).sort({ createdAt: -1 }).limit(300).toArray()]);
  return NextResponse.json({ settings, google: cache, hasKey: !!key, writeUrl: writeReviewUrl(settings), requests: reqs.map(toRequest), canEdit: can(await getSession(), "leads", "edit") });
}

export async function PUT(req: Request) {
  const deny = await guard("leadSettings");
  if (deny) return deny;
  const next = cleanReviewSettings(await jsonBody(req));
  await saveReviewSettings(next);
  revalidateTag("reviews");
  await logActivity(await getSession(), "Google reviews", `Saved settings (reviews on website ${next.show ? "on" : "off"})`, "", req);
  return NextResponse.json(next);
}

// { action: "refresh" } loads the rating and reviews from Google now.
export async function POST(req: Request) {
  const deny = await guard("leads");
  if (deny) return deny;
  const { action } = await jsonBody(req);
  if (action !== "refresh") return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const g = await googleData(await getReviewSettings(), true);
    revalidateTag("reviews");
    return NextResponse.json({ ok: true, google: g });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't reach Google." }, { status: 400 });
  }
}
