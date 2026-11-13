import { getSecret } from "./secrets";

// Natural-sounding speech for the voice assistant from Google Gemini's text-to-speech (same free key as the chat).
// Gemini returns raw 16-bit PCM at 24 kHz; it is wrapped in a WAV header so any browser can play it.

const VOICES = { female: "Kore", male: "Charon" } as const;
let ttsModel = "";
// Recently spoken lines (the greeting, common answers) are kept, so they play at once next time.
const cache = new Map<string, Buffer>();

// The newest "flash" text-to-speech model this key can use (remembered until the server restarts).
async function findTtsModel(key: string): Promise<string> {
  if (ttsModel) return ttsModel;
  const custom = await getSecret("GEMINI_TTS_MODEL");
  if (custom) return (ttsModel = custom);
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return "";
    const data = await res.json();
    const names: string[] = (data.models ?? []).map((m: { name: string }) => String(m.name).replace(/^models\//, "")).filter((n: string) => /tts/.test(n));
    const score = (n: string) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) ?? [])[1] ?? "0") * 10 + (/flash/.test(n) ? 5 : 0) - (/pro/.test(n) ? 5 : 0);
    ttsModel = names.sort((a, b) => score(b) - score(a))[0] ?? "";
  } catch {
    ttsModel = "";
  }
  return ttsModel;
}

function wav(pcm: Buffer, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function naturalSpeech(text: string, _lang: "en" | "hi" | "hinglish", gender: "female" | "male"): Promise<{ ok: true; audio: Buffer } | { ok: false; detail: string }> {
  const key = await getSecret("GEMINI_API_KEY");
  if (!key) return { ok: false, detail: "no key" };
  const model = await findTtsModel(key);
  if (!model) return { ok: false, detail: "no text-to-speech model for this key" };
  // Only the words to say: any instruction added here gets read out loud by the model.
  const hit = cache.get(`${gender}|${text}`);
  if (hit) return { ok: true, audio: hit };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES[gender] } } } },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      if (res.status === 404) ttsModel = "";
      const e = await res.json().catch(() => ({}));
      return { ok: false, detail: `${model} ${res.status} ${String(e?.error?.message ?? "").slice(0, 160)}` };
    }
    const data = await res.json();
    const b64 = (data.candidates?.[0]?.content?.parts ?? []).find((p: { inlineData?: { data?: string } }) => p.inlineData?.data)?.inlineData?.data;
    if (!b64) return { ok: false, detail: `${model}: no audio` };
    const audio = wav(Buffer.from(b64, "base64"));
    cache.set(`${gender}|${text}`, audio);
    if (cache.size > 80) cache.delete(cache.keys().next().value as string);
    return { ok: true, audio };
  } catch (e) {
    return { ok: false, detail: (e as Error)?.name === "TimeoutError" ? `${model}: too slow` : String((e as Error)?.message ?? e).slice(0, 160) };
  }
}
