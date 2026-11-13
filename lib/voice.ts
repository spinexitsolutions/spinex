"use client";

// Speech for the website assistant, done by the visitor's own browser (free, nothing is sent to us but the text).
// Listening: Web Speech API (Chrome, Edge, Android, Safari 14.5+). Speaking: speechSynthesis (all modern browsers).

export type VoiceLang = "en" | "hi" | "hinglish";

type Rec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type RecCtor = new () => Rec;

function recCtor(): RecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function voiceSupported() {
  return !!recCtor() && typeof window !== "undefined" && "speechSynthesis" in window;
}

// Hindi is heard as Hindi; English and Hinglish as Indian English, so Hinglish comes back in Roman letters.
const recLang = (l: VoiceLang) => (l === "hi" ? "hi-IN" : "en-IN");

let current: Rec | null = null;

// Listens until the visitor stops talking. `onWords` gets the words as they are heard.
// Resolves with what was said ("" for silence) or rejects with "denied" / "no-mic" / "error".
export function listen(lang: VoiceLang, onWords: (text: string) => void): Promise<string> {
  const Ctor = recCtor();
  if (!Ctor) return Promise.reject(new Error("unsupported"));
  stopListening();
  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    current = rec;
    rec.lang = recLang(lang);
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = "";
    let failed = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      onWords((finalText + " " + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") failed = "denied";
      else if (e.error === "audio-capture") failed = "no-mic";
      else if (e.error !== "no-speech" && e.error !== "aborted") failed = "error";
    };
    rec.onend = () => {
      if (current === rec) current = null;
      if (failed) reject(new Error(failed));
      else resolve(finalText.trim());
    };
    try {
      rec.start();
    } catch {
      reject(new Error("error"));
    }
  });
}

export function stopListening() {
  try {
    current?.abort();
  } catch {
    /* already stopped */
  }
  current = null;
}

// ---------- Speaking ----------

const FEMALE = /female|woman|heera|kalpana|lekha|veena|neerja|swara|aditi|raveena|priya|sangeeta|zira|samantha|karen|moira|tessa|google (हिन्दी|hindi)|google uk english female/i;
const MALE = /\bmale\b|\bman\b|rishi|hemant|prabhat|madhur|ravi|kunal|daniel|alex|fred|david|mark|google uk english male/i;

function voices(): Promise<SpeechSynthesisVoice[]> {
  const list = speechSynthesis.getVoices();
  if (list.length) return Promise.resolve(list);
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1200);
  });
}

// The best voice the device has for the language, preferring the chosen gender.
async function pickVoice(lang: VoiceLang, gender: "female" | "male") {
  const all = await voices();
  const want = lang === "hi" ? ["hi-IN", "hi"] : ["en-IN", "en-GB", "en-US", "en"];
  for (const code of want) {
    const same = all.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(code.toLowerCase()));
    if (!same.length) continue;
    const g = same.filter((v) => (gender === "female" ? FEMALE.test(v.name) && !MALE.test(v.name) : MALE.test(v.name)));
    return (g[0] ?? same.find((v) => v.localService) ?? same[0]) || null;
  }
  return null;
}

let speakId = 0;

// One audio player for the natural voice. Phones only let a page play sound after a tap, so the first tap
// "unlocks" this player by playing a silent clip; later answers reuse it.
let player: HTMLAudioElement | null = null;
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!player) player = new Audio();
  try {
    player.src = SILENT;
    void player.play().catch(() => undefined);
  } catch {
    /* ignore */
  }
}

// Human-like voice from the server (Gemini). Returns false when it isn't available, so the browser voice is used.
async function speakNatural(text: string, lang: VoiceLang, id: number): Promise<boolean> {
  try {
    const res = await fetch("/api/chat/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, lang }) });
    if (res.status !== 200 || id !== speakId) return id !== speakId;
    const url = URL.createObjectURL(await res.blob());
    if (id !== speakId) return true;
    if (!player) player = new Audio();
    const p = player;
    await new Promise<void>((resolve) => {
      const done = () => {
        p.onended = p.onerror = p.onpause = null;
        resolve();
      };
      p.src = url;
      p.onended = done;
      p.onerror = done;
      p.onpause = done;
      p.play().catch(done);
    });
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

// Speaks the text: the natural voice when it's set up, otherwise the device's voice sentence by sentence
// (long single utterances get cut off in Chrome). Resolves when done or stopped.
export async function speak(text: string, lang: VoiceLang, gender: "female" | "male", engine: "natural" | "browser" = "browser"): Promise<void> {
  if (typeof window === "undefined") return;
  const id = ++speakId;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (engine === "natural" && (await speakNatural(text, lang, id))) return;
  if (id !== speakId || !("speechSynthesis" in window)) return;
  const voice = await pickVoice(lang, gender);
  const parts = text.replace(/\s+/g, " ").match(/[^.!?।]+[.!?।]*/g) ?? [text];
  for (const part of parts) {
    if (id !== speakId) return;
    const t = part.trim();
    if (!t) continue;
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(t);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? (lang === "hi" ? "hi-IN" : "en-IN");
      u.rate = 1;
      u.pitch = 1;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
      // Safety net: some phones never fire onend.
      setTimeout(resolve, Math.max(4000, t.length * 120));
    });
  }
}

export function stopSpeaking() {
  speakId++;
  try {
    if (player && !player.paused) player.pause();
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
}
