import { getSecret } from "./secrets";
import { waNumber } from "./auto-reply-text";

// WhatsApp message to the owner for every new enquiry. Works with any one of three set-ups
// (Admin → API keys → WhatsApp alerts), checked in this order:
//  1. Your own WhatsApp API panel: a link with {to} and {text} in it (most Indian WABA panels).
//  2. Meta WhatsApp Cloud API: access token + phone number ID (+ an approved template).
//  3. CallMeBot: free, for alerts to your own number only.
// Never throws and gives up after 8 seconds, so the visitor's form is never held up.

export type AlertResult = { ok: boolean; error: string; via: string };

export { waNumber };

const TIMEOUT = 8000;

export async function sendWhatsAppAlert(text: string): Promise<AlertResult> {
  const [to, apiUrl, cloudToken, cloudPhoneId, cloudTemplate, cloudLang, callmebotKey] = await Promise.all(
    ["WA_ALERT_TO", "WA_API_URL", "WA_CLOUD_TOKEN", "WA_CLOUD_PHONE_ID", "WA_CLOUD_TEMPLATE", "WA_CLOUD_LANG", "CALLMEBOT_APIKEY"].map(getSecret),
  );
  const number = waNumber(to);

  try {
    // 1. Own panel / any provider with a "send message" link.
    if (apiUrl) {
      if (!/^https:\/\//i.test(apiUrl)) return { ok: false, error: "The API link must start with https://", via: "panel" };
      if (!apiUrl.includes("{text}")) return { ok: false, error: "Put {text} in the API link where the message goes (and {to} where your number goes).", via: "panel" };
      if (apiUrl.includes("{to}") && !number) return { ok: false, error: "Add your WhatsApp number ('Send alerts to').", via: "panel" };
      const url = apiUrl.replace(/\{to\}/g, encodeURIComponent(number)).replace(/\{text\}/g, encodeURIComponent(text));
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
      if (!res.ok) return { ok: false, error: `Your WhatsApp panel replied with ${res.status}. Check the link and token.`, via: "panel" };
      return { ok: true, error: "", via: "panel" };
    }

    // 2. Meta WhatsApp Cloud API.
    if (cloudToken || cloudPhoneId) {
      if (!cloudToken || !cloudPhoneId) return { ok: false, error: "Fill both the Cloud API access token and the phone number ID.", via: "cloud" };
      if (!number) return { ok: false, error: "Add your WhatsApp number ('Send alerts to').", via: "cloud" };
      // Business-started messages need an approved template with one {{1}} in the body. Without a template
      // a plain text is tried, which WhatsApp only delivers if you messaged the business number in the last 24 hours.
      const oneLine = text.replace(/\s*\n+\s*/g, " · ").replace(/\s{4,}/g, "   ").slice(0, 900);
      const message = cloudTemplate
        ? { type: "template", template: { name: cloudTemplate, language: { code: cloudLang || "en" }, components: [{ type: "body", parameters: [{ type: "text", text: oneLine }] }] } }
        : { type: "text", text: { body: text.slice(0, 4000) } };
      const res = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(cloudPhoneId)}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${cloudToken}` },
        body: JSON.stringify({ messaging_product: "whatsapp", to: number, ...message }),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        return { ok: false, error: `WhatsApp Cloud API: ${j?.error?.message || `error ${res.status}`}`, via: "cloud" };
      }
      return { ok: true, error: "", via: "cloud" };
    }

    // 3. CallMeBot (free, own number only).
    if (callmebotKey) {
      if (!number) return { ok: false, error: "Add your WhatsApp number ('Send alerts to').", via: "callmebot" };
      const url = `https://api.callmebot.com/whatsapp.php?phone=%2B${number}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(callmebotKey)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
      const body = await res.text().catch(() => "");
      if (!res.ok || /invalid|error|not\s+valid/i.test(body)) return { ok: false, error: "CallMeBot didn't accept it. Check your number and the API key it sent you.", via: "callmebot" };
      return { ok: true, error: "", via: "callmebot" };
    }

    return { ok: false, error: "WhatsApp alerts aren't set up yet (Admin → API keys → WhatsApp alerts).", via: "" };
  } catch (e) {
    console.error("WhatsApp alert failed:", e);
    return { ok: false, error: "Couldn't reach the WhatsApp service. Try again in a minute.", via: "" };
  }
}

// The alert text for a new enquiry.
export function leadAlertText(lead: Record<string, string>, from: string, adminUrl: string) {
  const phone = waNumber(lead.phone || "");
  const details = [
    `Name: ${lead.name || "-"}`,
    `Phone: ${lead.phone || "-"}`,
    lead.email ? `Email: ${lead.email}` : "",
    lead.services ? `Needs: ${lead.services}` : "",
    lead.budget ? `Budget: ${lead.budget}` : "",
    lead.message ? `Message: ${lead.message.slice(0, 300)}${lead.message.length > 300 ? "…" : ""}` : "",
    `From: ${from}`,
  ].filter(Boolean);
  const links = [phone ? `Reply on WhatsApp: https://wa.me/${phone}` : "", `Open admin: ${adminUrl}`].filter(Boolean);
  return ["🔔 New enquiry on your website", details.join("\n"), links.join("\n")].join("\n\n");
}
