import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { hasDb } from "@/lib/db";
import { getSecret } from "@/lib/secrets";
import { metaSignatureOk, noteAdError, safeEqual, saveAdLead, type AdField } from "@/lib/ad-leads";

// Meta Lead Ads (Facebook / Instagram instant forms) → Leads.
// Meta calls this when someone submits a lead form: we check the signature, fetch the answers with the Page token, save the lead.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const graphBase = () => (process.env.META_GRAPH_URL || "https://graph.facebook.com").replace(/\/+$/, "");
const version = async () => ((await getSecret("META_GRAPH_VERSION")) || "v23.0").replace(/[^\w.]/g, "");

// Step 1 of the setup: Meta checks the URL with the verify token you typed.
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const token = await getSecret("META_VERIFY_TOKEN");
  if (u.get("hub.mode") === "subscribe" && token && safeEqual(String(u.get("hub.verify_token") ?? ""), token)) {
    return new NextResponse(String(u.get("hub.challenge") ?? "").slice(0, 200), { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new NextResponse("Verify token doesn't match.", { status: 403 });
}

type Change = { field?: string; value?: { leadgen_id?: string; form_id?: string; ad_id?: string; page_id?: string } };

async function graph<T>(path: string, token: string, secret: string): Promise<T> {
  const proof = secret ? `&appsecret_proof=${createHmac("sha256", secret).update(token).digest("hex")}` : "";
  const res = await fetch(`${graphBase()}/${await version()}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}${proof}`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok || data.error) throw new Error(data.error?.message || `Meta replied ${res.status}`);
  return data;
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "offline" }, { status: 503 });
  const raw = await req.text();
  if (raw.length > 200_000) return NextResponse.json({ error: "too big" }, { status: 413 });
  const secret = await getSecret("META_APP_SECRET");
  if (!metaSignatureOk(raw, req.headers.get("x-hub-signature-256") ?? "", secret)) {
    if (!secret) await noteAdError("meta", "A lead arrived but the Meta App secret isn't set, so it couldn't be checked.");
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  let body: { object?: string; entry?: { changes?: Change[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const token = await getSecret("META_PAGE_TOKEN");
  const changes = (body.entry ?? []).flatMap((e) => e.changes ?? []).filter((c) => c.field === "leadgen" && c.value?.leadgen_id).slice(0, 50);
  let saved = 0;
  for (const c of changes) {
    const id = String(c.value!.leadgen_id).replace(/[^\d_]/g, "").slice(0, 40);
    if (!id) continue;
    try {
      if (!token) throw new Error("the Page access token isn't set");
      const lead = await graph<{ field_data?: { name: string; values?: string[] }[]; ad_name?: string; campaign_name?: string; form_id?: string; platform?: string; is_organic?: boolean }>(
        `${id}?fields=created_time,field_data,ad_name,adset_name,campaign_name,form_id,platform,is_organic`, token, secret,
      );
      const formId = lead.form_id || c.value!.form_id || "";
      const form = formId ? await graph<{ name?: string }>(`${formId.replace(/\D/g, "")}?fields=name`, token, secret).catch(() => ({ name: "" })) : { name: "" };
      const fields: AdField[] = (lead.field_data ?? []).map((f) => ({ key: String(f.name ?? ""), label: "", value: (f.values ?? []).join(", ") }));
      const r = await saveAdLead({ source: "meta", externalId: id, fields, campaign: lead.campaign_name ?? "", adName: lead.ad_name ?? "", formName: form.name ?? "", platform: lead.platform === "ig" ? "instagram" : "facebook", clickId: "", isTest: false });
      if (r.saved) saved++;
    } catch (e) {
      // Nothing is lost: the lead is saved with its ID and filled in when Meta sends it again.
      const why = e instanceof Error ? e.message : "unknown error";
      await saveAdLead({ source: "meta", externalId: id, fields: [], campaign: "", adName: "", formName: "", platform: "facebook", clickId: "", isTest: false, incomplete: why });
      await noteAdError("meta", `Couldn't load lead ${id}: ${why}`);
    }
  }
  return NextResponse.json({ ok: true, saved });
}
