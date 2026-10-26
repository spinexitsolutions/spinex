import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { getReviewSettings, markClicked } from "@/lib/reviews-db";
import { writeReviewUrl } from "@/lib/reviews";
import { SITE_URL } from "@/lib/site";

// The link in review request emails: notes that it was opened, then goes to Google's "write a review" page.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  if (!hasDb()) return NextResponse.redirect(SITE_URL);
  const token = String(params.token || "");
  if (/^[A-Za-z0-9_-]{10,40}$/.test(token)) await markClicked(token).catch(() => undefined);
  const url = writeReviewUrl(await getReviewSettings());
  return NextResponse.redirect(url || SITE_URL, 302);
}
