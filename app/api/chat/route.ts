import { NextResponse } from "next/server";
import { askAi } from "@/lib/ai-chat";
import { voiceSettings } from "@/lib/content";
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
  // The conversation sent to the AI must start with a visitor message.
  while (recent.length && recent[0].role !== "user") recent.shift();
  return recent.length ? recent : null;
}

const LANG = { en: "English", hi: "Hindi (Devanagari script)", hinglish: "Hinglish (Hindi words in Roman script, mixed with English)" } as const;

// Reads the details line the assistant adds once it has a visitor's name, phone and email.
function takeLead(text: string) {
  const m = text.match(/^\s*LEAD:\s*(\{.*\})\s*$/m);
  if (!m) return { reply: text.trim(), lead: null };
  let lead: Record<string, string> | null = null;
  try {
    const o = JSON.parse(m[1]);
    lead = { name: String(o.name ?? "").slice(0, 80), phone: String(o.phone ?? "").slice(0, 25), email: String(o.email ?? "").slice(0, 120), needs: String(o.needs ?? "").slice(0, 300) };
    if (!lead.name || !lead.phone) lead = null;
  } catch {
    lead = null;
  }
  return { reply: text.replace(m[0], "").trim(), lead };
}

// Used when a Gemini (free) or Anthropic key is set in Admin → API keys. Otherwise the chatbot answers offline.
// The facts the assistant may use are built here from the saved site content, never taken from the browser.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { messages?: unknown; voice?: unknown; lang?: unknown; leadDone?: unknown } | null;
  const history = readMessages(body && typeof body === "object" ? body.messages : null);
  if (!history) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (await rateLimited(`chat:${clientIp(req)}`, 30, 10 * 60 * 1000).catch(() => false)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const content = await getContent();
  const v = voiceSettings(content);
  const spoken = body?.voice === true;
  const lang = (["en", "hi", "hinglish"] as const).find((x) => x === body?.lang);
  const asked = history.filter((m) => m.role === "user").length;
  const knowledge = knowledgeText(content);

  const system = [
    `You are ${content.chatbot.name || "the website assistant"} for ${content.brand.name}, a web and digital agency. Be friendly, professional and brief.`,
    spoken
      ? "Your reply will be spoken aloud: 1 to 3 short sentences, plain sentences only, no lists, no markdown, no emojis, no links. Say numbers the way people say them."
      : "Answer in 2 to 4 sentences. No markdown headings.",
    lang ? `Reply in ${LANG[lang]}.` : "Reply in the visitor's language (English, Hindi or Hinglish).",
    "Use only the facts below. For prices or anything not listed, say the team will share a clear quote after understanding the need. Never invent prices, timelines or clients.",
    body?.leadDone === true ? "The visitor's contact details are already saved. Do not ask for them again and do not add a LEAD line." : v.askAfter > 0
      ? `After the visitor has asked ${v.askAfter} question${v.askAfter > 1 ? "s" : ""} (they have asked ${asked} so far), or sooner if they want a quote, a call or to start, politely ask for their name, mobile number and email so the team can contact them. Ask for what is still missing, one or two things at a time.`
      : "Only when the visitor wants a quote, a call or to start, politely ask for their name, mobile number and email so the team can contact them.",
    body?.leadDone === true ? "" : 'When you have their name, mobile number and email, thank them and add one final line exactly like this (it is not shown to the visitor): LEAD: {"name":"...","phone":"...","email":"...","needs":"short summary of what they want"}. Add that line only once in the conversation.',
    v.notes.trim() ? `Instructions from the owner: ${v.notes.trim()}` : "",
    `Facts:\n${knowledge.slice(0, 9000)}`,
  ].filter(Boolean).join("\n\n");

  const ai = await askAi(system, history, spoken ? 350 : 500);
  if (!ai.ok) return NextResponse.json({ error: ai.error }, { status: ai.error === "not_configured" ? 501 : 502 });
  const { reply, lead } = takeLead(ai.reply);
  return NextResponse.json({ reply, lead: body?.leadDone === true ? null : lead });
}
