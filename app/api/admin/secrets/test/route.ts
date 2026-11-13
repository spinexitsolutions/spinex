import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { askAi, chatProvider } from "@/lib/ai-chat";
import { lastEmailError, notifyAdmin, smtpSettings } from "@/lib/notify";
import { sendLeadWebhook } from "@/lib/webhook";
import { leadAlertText, sendWhatsAppAlert } from "@/lib/whatsapp-alert";

// Buttons in Admin → API keys: send a test email, ask the AI one question, or send a sample lead.
export async function POST(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  const { kind } = (await jsonBody(req)) as { kind?: string };

  if (kind === "email") {
    const s = await smtpSettings();
    if (!s.SMTP_HOST || !s.SMTP_USER || !s.SMTP_PASS || !s.NOTIFY_EMAIL) return NextResponse.json({ ok: false, message: "Fill server, email login, password and 'Send alerts to' first, then save." });
    const ok = await notifyAdmin("Test email from your website", [["Status", "Email alerts are working."], ["Sent at", new Date().toLocaleString("en-IN")]]);
    return NextResponse.json({ ok, message: ok ? `Sent to ${s.NOTIFY_EMAIL}. Check the inbox (and spam).` : `Sending failed. ${lastEmailError() || "Check the login and app password, then try again."}` });
  }

  if (kind === "chat") {
    const p = await chatProvider();
    if (!p) return NextResponse.json({ ok: false, message: "Add the Gemini (free) or Anthropic API key first, then save." });
    const r = await askAi("Reply with exactly: Chatbot is working.", [{ role: "user", content: "Test" }], 30);
    const name = p.provider === "gemini" ? "Google Gemini" : "Anthropic";
    if (r.ok) return NextResponse.json({ ok: true, message: `Working: ${name}, model ${r.model}.` });
    if (r.error === "rejected") return NextResponse.json({ ok: false, message: `${name} rejected the request (${r.status}). Check the API key and the model name, then save again.` });
    return NextResponse.json({ ok: false, message: `${name} didn't answer${r.status ? ` (${r.status})` : ""}. ${r.status === 429 ? "The free daily limit may be used up; try again later." : "Check the model name, or try again in a minute."}` });
  }

  if (kind === "webhook") {
    const r = await sendLeadWebhook({ name: "Test lead", phone: "9999999999", email: "test@example.com", services: "Website development", message: "This is a test from Admin → API keys.", source: "test", createdAt: new Date().toISOString() });
    return NextResponse.json({ ok: r.ok, message: r.ok ? "Sample lead sent. Check your app." : r.error });
  }

  if (kind === "whatsapp") {
    const text = leadAlertText({ name: "Test lead", phone: "9999999999", services: "Website development", message: "This is a test from Admin → API keys." }, "Test", `${new URL(req.url).origin}/admin`);
    const r = await sendWhatsAppAlert(text);
    return NextResponse.json({ ok: r.ok, message: r.ok ? "Test message sent. Check WhatsApp (it can take a minute)." : r.error });
  }

  return NextResponse.json({ ok: false, message: "Unknown test." }, { status: 400 });
}
