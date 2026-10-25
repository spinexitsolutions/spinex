import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { getSecret, saveSecrets } from "@/lib/secrets";
import { adLeadsState } from "@/lib/ad-leads";
import { can } from "@/lib/roles";
import { SITE_URL } from "@/lib/site";

// Setup status for Admin → Leads → Get leads from ads. Never returns secret values.
export async function GET(req: Request) {
  const deny = await guard("leads", "view");
  if (deny) return deny;
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  const [state, appSecret, verify, page, gkey] = await Promise.all([adLeadsState(), getSecret("META_APP_SECRET"), getSecret("META_VERIFY_TOKEN"), getSecret("META_PAGE_TOKEN"), getSecret("GOOGLE_LEADS_KEY")]);
  return NextResponse.json({
    metaUrl: `${origin}/api/ads/meta`,
    googleUrl: `${origin}/api/ads/google`,
    meta: { appSecret: !!appSecret, verifyToken: !!verify, pageToken: !!page },
    google: { key: !!gkey },
    canEdit: can(await getSession(), "users"),
    state: {
      lastMeta: state.last_meta ?? "", lastMetaName: state.last_meta_name ?? "", errorMeta: state.error_meta ?? "", errorMetaAt: state.error_meta_at ?? "",
      lastGoogle: state.last_google ?? "", lastGoogleName: state.last_google_name ?? "", errorGoogle: state.error_google ?? "", errorGoogleAt: state.error_google_at ?? "",
    },
  });
}

// Owner only: { make: "META_VERIFY_TOKEN" | "GOOGLE_LEADS_KEY" } makes a random value, saves it and shows it once to copy.
export async function POST(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  const { make } = await jsonBody(req);
  if (make !== "META_VERIFY_TOKEN" && make !== "GOOGLE_LEADS_KEY") return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const value = `spx_${randomBytes(18).toString("base64url")}`;
  try {
    await saveSecrets({ [make]: value }, {});
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't save." }, { status: 400 });
  }
  await logActivity(await getSession(), "API keys", `Made a new ${make === "GOOGLE_LEADS_KEY" ? "Google Ads webhook key" : "Meta verify token"}`, "", req);
  return NextResponse.json({ value });
}
