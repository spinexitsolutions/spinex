import { NextResponse } from "next/server";
import { getSecret } from "@/lib/secrets";
import { getContent } from "@/lib/content-server";
import { knowledgeText } from "@/lib/chat";
import { clientIp, rateLimited } from "@/lib/antispam";

type Msg = { role: "user" | "assistant"; content: string };

const MAX_MESSAGES = 10;
const MAX_CHARS = 2000;

// Accepts only plain user/assistant text messages; anything else is rejected.
// The browser sends the whole conversation, so only the last 10 messages are used, each cut to 2000 characters.
function readMessages(raw: unknown): Msg[] | null {
  if (!Array.isArray(raw) || !raw.length || raw.length > 100) return null;
  const out: Msg[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    if (content.trim()) out.push({ role, content: content.slice(0, MAX_CHARS) });
  }
  const recent = out.slice(-MAX_MESSAGES);
  // The conversation sent to Anthropic must start with a visitor message.
  while (recent.length && recent[0].role !== "user") recent.shift();
  return recent.length ? recent : null;
}

// Optional: only used when an Anthropic key is set (Admin → API keys or .env.local). Otherwise the chatbot answers offline.
// The facts the assistant may use are built here from the saved site content, never taken from the browser.
export async function POST(req: Request) {
  const key = await getSecret("ANTHROPIC_API_KEY");
  const model = (await getSecret("CHAT_MODEL")) || "claude-haiku-4-5-20251001";
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  const body = (await req.json().catch(() => null)) as { messages?: unknown } | null;
  const history = readMessages(body && typeof body === "object" ? body.messages : null);
  if (!history) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (await rateLimited(`chat:${clientIp(req)}`, 20, 10 * 60 * 1000).catch(() => false)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const knowledge = knowledgeText(await getContent());

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        system:
          "You are the website assistant for a web and digital agency. Answer briefly (2-4 sentences), friendly and professional. Reply in the user's language (English, Hindi or Hinglish). Use only the facts below; for prices or anything not listed, invite them to share details or contact the team.\n\n" +
          knowledge.slice(0, 8000),
        messages: history,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
  const data = await res.json().catch(() => ({}));
  const reply = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
  return NextResponse.json({ reply });
}
