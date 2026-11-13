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
    let lastHeard = "";
    let failed = "";
    // Some phones (Android Chrome) send the same words again as a new result, e.g. "340" and then "7340".
    // So the text is rebuilt from all results each time, and a result that repeats or extends the one
    // before it replaces it instead of being added.
    rec.onresult = (e) => {
      const pieces: string[] = [];
      let allFinal = true;
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.trim();
        if (!e.results[i].isFinal) allFinal = false;
        if (!t) continue;
        const prev = pieces[pieces.length - 1];
        const flat = (x: string) => x.replace(/\s+/g, "").toLowerCase();
        if (prev && flat(t).includes(flat(prev))) pieces[pieces.length - 1] = t;
        else if (prev && flat(prev).includes(flat(t))) continue;
        else pieces.push(t);
      }
      const text = pieces.join(" ").replace(/\s+/g, " ").trim();
      if (allFinal) finalText = text;
      onWords(text);
      if (!allFinal) lastHeard = text;
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") failed = "denied";
      else if (e.error === "audio-capture") failed = "no-mic";
      else if (e.error !== "no-speech" && e.error !== "aborted") failed = "error";
    };
    rec.onend = () => {
      if (current === rec) current = null;
      if (failed) reject(new Error(failed));
      else resolve((finalText || lastHeard).trim());
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

// Human-like voice from the server (Gemini). The first sentence is asked for on its own, so it can start playing
// while the rest is still being made. Returns false when it isn't available, so the browser voice is used.
function fetchVoice(text: string, lang: VoiceLang): Promise<Blob | null> {
  return fetch("/api/chat/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, lang }) })
    .then((r) => (r.status === 200 ? r.blob() : null))
    .catch(() => null);
}

function play(blob: Blob): Promise<void> {
  if (!player) player = new Audio();
  const p = player;
  const url = URL.createObjectURL(blob);
  return new Promise<void>((resolve) => {
    const done = () => {
      p.onended = p.onerror = p.onpause = null;
      URL.revokeObjectURL(url);
      resolve();
    };
    p.src = url;
    p.onended = done;
    p.onerror = done;
    p.onpause = done;
    p.play().catch(done);
  });
}

function chunks(text: string): string[] {
  const parts = (text.replace(/\s+/g, " ").match(/[^.!?।]+[.!?।]*/g) ?? [text]).map((x) => x.trim()).filter(Boolean);
  if (parts.length <= 1) return parts;
  // A very short first sentence ("Haan ji.") is joined with the next one so it doesn't sound cut off.
  let i = 1;
  let first = parts[0];
  while (first.length < 25 && i < parts.length) first += " " + parts[i++];
  const rest = parts.slice(i).join(" ");
  return rest ? [first, rest] : [first];
}

// Once the natural voice fails (e.g. the free daily limit is used up), the rest of the visit uses the phone's
// voice, so the voice doesn't keep switching between answers.
let naturalOff = false;

async function speakNatural(text: string, lang: VoiceLang, id: number, gender: "female" | "male"): Promise<boolean> {
  if (naturalOff) return false;
  const list = chunks(text);
  if (!list.length) return true;
  const pending = list.map((t) => fetchVoice(t, lang));
  const first = await pending[0];
  if (id !== speakId) return true;
  if (!first) {
    naturalOff = true;
    return false;
  }
  await play(first);
  for (let i = 1; i < list.length; i++) {
    if (id !== speakId) return true;
    const blob = await pending[i];
    if (id !== speakId) return true;
    if (blob) await play(blob);
    else {
      naturalOff = true;
      await speakBrowser(list[i], lang, gender, id);
    }
  }
  return true;
}

// Speaks the text: the natural voice when it's set up, otherwise the device's voice sentence by sentence
// (long single utterances get cut off in Chrome). Resolves when done or stopped.
export async function speak(text: string, lang: VoiceLang, gender: "female" | "male", engine: "natural" | "browser" = "browser"): Promise<void> {
  if (typeof window === "undefined") return;
  const id = ++speakId;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (engine === "natural" && (await speakNatural(text, lang, id, gender))) return;
  if (id !== speakId) return;
  await speakBrowser(text, lang, gender, id);
}

async function speakBrowser(text: string, lang: VoiceLang, gender: "female" | "male", id: number): Promise<void> {
  if (!("speechSynthesis" in window)) return;
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
