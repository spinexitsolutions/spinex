import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { getSecret } from "@/lib/secrets";
import { noteAdError, safeEqual, saveAdLead } from "@/lib/ad-leads";

// Google Ads lead form → Leads. Google posts each lead here with the key you set in the lead form's webhook settings.
export const dynamic = "force-dynamic";

type GoogleLead = {
  lead_id?: string; google_key?: string; is_test?: boolean; gcl_id?: string; campaign_id?: string | number; form_id?: string | number; adgroup_id?: string | number; creative_id?: string | number;
  user_column_data?: { column_id?: string; column_name?: string; string_value?: string }[];
};

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "offline" }, { status: 503 });
  const raw = await req.text();
  if (raw.length > 100_000) return NextResponse.json({ error: "too big" }, { status: 413 });
  let b: GoogleLead;
  try {
    b = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const key = await getSecret("GOOGLE_LEADS_KEY");
  if (!key) {
    await noteAdError("google", "A Google Ads lead arrived but the webhook key isn't set in Admin → API keys.");
    return NextResponse.json({ error: "not set up" }, { status: 401 });
  }
  if (!safeEqual(String(b.google_key ?? ""), key)) return NextResponse.json({ error: "wrong key" }, { status: 401 });
  const id = String(b.lead_id ?? "").replace(/[^\w-]/g, "").slice(0, 80);
  if (!id) return NextResponse.json({ error: "no lead id" }, { status: 400 });
  // Google sends standard fields by column_id (FULL_NAME, PHONE_NUMBER, EMAIL…) and your own questions by column_name.
  const fields = (b.user_column_data ?? []).slice(0, 40).map((c) => ({ key: String(c.column_id || c.column_name || ""), label: String(c.column_name || ""), value: String(c.string_value ?? "").slice(0, 1000) }));
  await saveAdLead({
    source: "google",
    externalId: id,
    fields,
    campaign: b.campaign_id ? `Campaign ${b.campaign_id}` : "",
    adName: b.adgroup_id ? `Ad group ${b.adgroup_id}` : "",
    formName: b.form_id ? `Form ${b.form_id}` : "",
    platform: "google",
    clickId: String(b.gcl_id ?? "").slice(0, 200),
    isTest: !!b.is_test,
  });
  return NextResponse.json({});
}
