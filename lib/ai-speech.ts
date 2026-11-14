import { getSecret } from "./secrets";

// Natural-sounding speech for the voice assistant from Google Gemini's text-to-speech (same free key as the chat).
// Gemini returns raw 16-bit PCM at 24 kHz; it is wrapped in a WAV header so any browser can play it.

// Default Gemini voices; the owner can pick another in Admin → Chatbot → Voice assistant.
const VOICES = { female: "Kore", male: "Charon" } as const;
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

// Gemini's audio sometimes ends with a short, very loud burst of noise after the speech has finished
// (heard as a "crash"). Find where the speech really ends — the last stretch of quiet that is followed only by
// a short sound — and cut there.
function speechEnd(raw: Buffer, n: number, rate: number) {
  const win = Math.floor(rate * 0.02); // 20 ms windows
  const count = Math.floor(n / win);
  const rms: number[] = [];
  for (let w = 0; w < count; w++) {
    let sum = 0;
    for (let i = w * win; i < (w + 1) * win; i++) {
      const v = raw.readInt16LE(i * 2);
      sum += v * v;
    }
    rms.push(Math.sqrt(sum / win));
  }
  let end = count;
  // Up to 3 rounds, in case there is more than one burst.
  for (let round = 0; round < 3; round++) {
    let w = end - 1;
    while (w >= 0 && rms[w] < 250) w--; // skip silence already at the end
    const soundEnd = w + 1;
    while (w >= 0 && rms[w] >= 250) w--; // the last sound
    const soundStart = w + 1;
    let quiet = 0;
    while (w >= 0 && rms[w] < 250) {
      quiet++;
      w--;
    }
    const soundLen = soundEnd - soundStart;
    // The noise is short (under 0.5 s), comes after at least 120 ms of quiet, and is much louder than the
    // speech before it (a real last word is about as loud as the rest).
    const loud = Math.max(...rms.slice(soundStart, soundEnd), 0);
    const speech = rms.slice(0, Math.max(0, w + 1)).filter((x) => x >= 250).sort((x, y) => x - y);
    const typical = speech.length ? speech[Math.floor(speech.length * 0.75)] : 0;
    if (w >= 0 && quiet >= 6 && soundLen > 0 && soundLen <= 25 && typical > 0 && loud > typical * 1.6) end = soundStart - Math.min(quiet, 4);
    else {
      end = soundEnd;
      break;
    }
  }
  return Math.min(n, (end + 3) * win); // keep 60 ms after the last word
}

// Soft start and end (and a little silence after), so the clip doesn't start or end with a click.
function smooth(raw: Buffer, rate = 24000) {
  const n = speechEnd(raw, Math.floor(raw.length / 2), rate);
  const pcm = Buffer.alloc(n * 2 + Math.floor(rate * 0.25) * 2); // + 250 ms of silence
  raw.copy(pcm, 0, 0, n * 2);
  const fadeIn = Math.min(n, Math.floor(rate * 0.03));
  const fadeOut = Math.min(n, Math.floor(rate * 0.06));
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

export async function naturalSpeech(text: string, _lang: "en" | "hi" | "hinglish", gender: "female" | "male", voiceName = ""): Promise<{ ok: true; audio: Buffer } | { ok: false; detail: string }> {
  const key = await getSecret("GEMINI_API_KEY");
  if (!key) return { ok: false, detail: "no key" };
  const hit = cache.get(`${voiceName || gender}|${text}`);
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
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || VOICES[gender] } } } },
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
      cache.set(`${voiceName || gender}|${text}`, audio);
      if (cache.size > 80) cache.delete(cache.keys().next().value as string);
      return { ok: true, audio };
    } catch (e) {
      last = (e as Error)?.name === "TimeoutError" ? `${model}: too slow` : String((e as Error)?.message ?? e).slice(0, 120);
    }
  }
  return { ok: false, detail: last || "no voice" };
}
