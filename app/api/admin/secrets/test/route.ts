import { NextResponse } from "next/server";
import { guard } from "@/lib/admin-guard";
import { getSecret } from "@/lib/secrets";
import { notifyAdmin, smtpSettings } from "@/lib/notify";
import { sendLeadWebhook } from "@/lib/webhook";

// Buttons in Admin → API keys: send a test email, ask the AI one question, or send a sample lead.
export async function POST(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  const { kind } = (await req.json().catch(() => ({}))) as { kind?: string };

  if (kind === "email") {
    const s = await smtpSettings();
    if (!s.SMTP_HOST || !s.SMTP_USER || !s.SMTP_PASS || !s.NOTIFY_EMAIL) return NextResponse.json({ ok: false, message: "Fill server, email login, password and 'Send alerts to' first, then save." });
    const ok = await notifyAdmin("Test email from your website", [["Status", "Email alerts are working."], ["Sent at", new Date().toLocaleString("en-IN")]]);
    return NextResponse.json({ ok, message: ok ? `Sent to ${s.NOTIFY_EMAIL}. Check the inbox (and spam).` : "Sending failed. Check the login and app password, then try again." });
  }

  if (kind === "chat") {
    const key = await getSecret("ANTHROPIC_API_KEY");
    if (!key) return NextResponse.json({ ok: false, message: "Add the Anthropic API key first, then save." });
    const model = (await getSecret("CHAT_MODEL")) || "claude-haiku-4-5-20251001";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 30, messages: [{ role: "user", content: "Reply with: Chatbot is working." }] }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 401) return NextResponse.json({ ok: false, message: "The API key was rejected. Check it and save again." });
      if (!res.ok) return NextResponse.json({ ok: false, message: `Anthropic replied with ${res.status}. Check the model name and your credits.` });
      return NextResponse.json({ ok: true, message: `Working (model ${model}).` });
    } catch {
      return NextResponse.json({ ok: false, message: "Couldn't reach Anthropic. Try again in a minute." });
    }
  }

  if (kind === "webhook") {
    const r = await sendLeadWebhook({ name: "Test lead", phone: "9999999999", email: "test@example.com", services: "Website development", message: "This is a test from Admin → API keys.", source: "test", createdAt: new Date().toISOString() });
    return NextResponse.json({ ok: r.ok, message: r.ok ? "Sample lead sent. Check your app." : r.error });
  }

  return NextResponse.json({ ok: false, message: "Unknown test." }, { status: 400 });
}
