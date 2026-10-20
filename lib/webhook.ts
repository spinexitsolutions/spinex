import { getSecret } from "./secrets";

// Posts a new lead as JSON to the webhook set in Admin → API keys (Zapier, Make, Google Sheets, a CRM).
// Never throws and gives up after 5 seconds, so the visitor's form is never held up.
export async function sendLeadWebhook(lead: Record<string, unknown>) {
  const url = await getSecret("LEAD_WEBHOOK_URL");
  if (!url || !/^https:\/\//i.test(url)) return { ok: false, error: url ? "The webhook URL must start with https://" : "No webhook URL set." };
  const secret = await getSecret("LEAD_WEBHOOK_SECRET");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(secret ? { "x-webhook-secret": secret } : {}) },
      body: JSON.stringify({ event: "lead.created", lead }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, error: `The app replied with ${res.status}.` };
    return { ok: true, error: "" };
  } catch (e) {
    console.error("Lead webhook failed:", e);
    return { ok: false, error: "Couldn't reach the webhook URL." };
  }
}
