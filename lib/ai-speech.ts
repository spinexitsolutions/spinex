import { getSecret } from "./secrets";

// Natural-sounding speech for the voice assistant from Google Gemini's text-to-speech (same free key as the chat).
// Gemini returns raw 16-bit PCM at 24 kHz; it is wrapped in a WAV header so any browser can play it.

// Bright, lively voices: Zephyr (female) and Puck (male).
const VOICES = { female: "Zephyr", male: "Puck" } as const;
// Every Gemini voice model has its own small free daily limit, so when one is used up the next one is tried.
let ttsModels: string[] = [];
const usedUp = new Map<string, number>(); // model -> time its limit was hit
// Recently spoken lines (the greeting, common answers) are kept, so they play at once next time.
const cache = new Map<string, Buffer>();

async function ttsModelList(key: string): Promise<string[]> {
  const custom = await getSecret("GEMINI_TTS_MODEL");
  if (!ttsModels.length) {
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        const names: string[] = (data.models ?? []).map((m: { name: string }) => String(m.name).replace(/^models\//, "")).filter((n: string) => /tts/.test(n));
        const score = (n: string) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) ?? [])[1] ?? "0") * 10 + (/flash/.test(n) ? 5 : 0) - (/pro/.test(n) ? 5 : 0);
        ttsModels = names.sort((x, y) => score(y) - score(x));
      }
    } catch {
      /* try again next time */
    }
  }
  const all = custom ? [custom, ...ttsModels.filter((m) => m !== custom)] : ttsModels;
  // A model whose limit was hit is skipped for 6 hours.
  return all.filter((m) => Date.now() - (usedUp.get(m) ?? 0) > 6 * 3600e3);
}

function smooth(raw: Buffer, rate = 24000) {
  const n = Math.floor(raw.length / 2);
  const pcm = Buffer.alloc(n * 2 + Math.floor(rate * 0.2) * 2); // + 200 ms of silence
  raw.copy(pcm, 0, 0, n * 2);
  const fadeIn = Math.min(n, Math.floor(rate * 0.01));
  const fadeOut = Math.min(n, Math.floor(rate * 0.08));
  for (let i = 0; i < fadeIn; i++) pcm.writeInt16LE(Math.round(pcm.readInt16LE(i * 2) * (i / fadeIn)), i * 2);
  for (let i = 0; i < fadeOut; i++) {
    const at = n - fadeOut + i;
    pcm.writeInt16LE(Math.round(pcm.readInt16LE(at * 2) * (1 - (i + 1) / fadeOut)), at * 2);
  }
  return pcm;
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
  const hit = cache.get(`${gender}|${text}`);
  if (hit) return { ok: true, audio: hit };
  const models = await ttsModelList(key);
  if (!models.length) return { ok: false, detail: "no voice model available right now (daily free limits used up)" };
  let last = "";
  for (const model of models.slice(0, 4)) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        // Only the words to say: any instruction added here gets read out loud by the model.
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES[gender] } } } },
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 429 || res.status === 404 || res.status === 403) {
        usedUp.set(model, Date.now());
        last = `${model} ${res.status}`;
        continue;
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        last = `${model} ${res.status} ${String(e?.error?.message ?? "").slice(0, 120)}`;
        continue;
      }
      const data = await res.json();
      const b64 = (data.candidates?.[0]?.content?.parts ?? []).find((p: { inlineData?: { data?: string } }) => p.inlineData?.data)?.inlineData?.data;
      if (!b64) {
        last = `${model}: no audio`;
        continue;
      }
      const audio = wav(smooth(Buffer.from(b64, "base64")));
      cache.set(`${gender}|${text}`, audio);
      if (cache.size > 80) cache.delete(cache.keys().next().value as string);
      return { ok: true, audio };
    } catch (e) {
      last = (e as Error)?.name === "TimeoutError" ? `${model}: too slow` : String((e as Error)?.message ?? e).slice(0, 120);
    }
  }
  return { ok: false, detail: last || "no voice" };
}
