import { NextResponse } from "next/server";

type Msg = { role: "user" | "assistant"; content: string };

// Optional: only used when ANTHROPIC_API_KEY is set. Otherwise the chatbot answers offline.
export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  const { messages, knowledge } = (await req.json()) as { messages: Msg[]; knowledge: string };
  const history = (messages ?? []).slice(-10).map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.CHAT_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system:
        "You are the website assistant for a web and digital agency. Answer briefly (2-4 sentences), friendly and professional. Reply in the user's language (English, Hindi or Hinglish). Use only the facts below; for prices or anything not listed, invite them to share details or contact the team.\n\n" +
        String(knowledge ?? "").slice(0, 8000),
      messages: history,
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
  const data = await res.json();
  const reply = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
  return NextResponse.json({ reply });
}
