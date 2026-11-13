import { NextResponse } from "next/server";
import { naturalSpeech } from "@/lib/ai-speech";
import { getContent } from "@/lib/content-server";
import { voiceSettings } from "@/lib/content";
import { clientIp, rateLimited } from "@/lib/antispam";

// The voice assistant's spoken answer as a WAV file (Gemini text-to-speech). 204 = use the browser's own voice instead.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: unknown; lang?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 700) : "";
  if (!text) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const v = voiceSettings(await getContent());
  if (!v.enabled || v.engine === "browser") return new NextResponse(null, { status: 204 });
  if (await rateLimited(`speak:${clientIp(req)}`, 40, 10 * 60 * 1000).catch(() => false)) return new NextResponse(null, { status: 204 });
  const lang = (["en", "hi", "hinglish"] as const).find((x) => x === body?.lang) ?? v.lang;
  const r = await naturalSpeech(text, lang, v.voice);
  if (!r.ok) return new NextResponse(null, { status: 204, headers: { "x-voice-note": r.detail.replace(/[^\x20-\x7e]/g, "").slice(0, 200) } });
  return new NextResponse(new Uint8Array(r.audio), { headers: { "content-type": "audio/wav", "cache-control": "no-store" } });
}
