import { getSecret } from "./secrets";

export type ChatMsg = { role: "user" | "assistant"; content: string };
export type AiResult = { ok: true; reply: string; provider: "gemini" | "anthropic"; model: string } | { ok: false; error: "not_configured" | "upstream" | "rejected"; status?: number; provider?: string; detail?: string };

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const DEFAULT_CLAUDE_MODEL = "claude-haiku-4-5-20251001";

// Gemini model names change often. When the saved or default one is not found, ask Google which models this key
// can use and pick its newest fast "flash" model (remembered until the server restarts).
let geminiFallback = "";
// The model names this key can use for chat (for the Test button and for picking a fallback).
export async function listGeminiModels(key: string): Promise<string[]> {
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: { name: string }) => String(m.name).replace(/^models\//, ""))
      .filter((n: string) => /^gemini/.test(n) && !/embedding|image|tts|audio|live|vision|exp/.test(n));
  } catch {
    return [];
  }
}
async function findGeminiModel(key: string): Promise<string> {
  if (geminiFallback) return geminiFallback;
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return "";
    const data = await res.json();
    const names: string[] = (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: { name: string }) => String(m.name).replace(/^models\//, ""))
      .filter((n: string) => /^gemini/.test(n) && !/embedding|image|tts|audio|live|vision|thinking|exp/.test(n));
    const score = (n: string) => {
      const v = parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) ?? [])[1] ?? "0");
      return v * 10 + (/flash/.test(n) ? 30 : 0) - (/pro|ultra/.test(n) ? 30 : 0) - (/lite/.test(n) ? 2 : 0) - (/preview/.test(n) ? 1 : 0) + (/latest/.test(n) ? 0.5 : 0);
    };
    geminiFallback = names.sort((a, b) => score(b) - score(a))[0] ?? "";
  } catch {
    geminiFallback = "";
  }
  return geminiFallback;
}

// Which AI answers the website chat: Google Gemini when its (free) key is set, otherwise Claude when that key is set.
export async function chatProvider() {
  const gemini = await getSecret("GEMINI_API_KEY");
  if (gemini) return { provider: "gemini" as const, key: gemini, model: (await getSecret("GEMINI_MODEL")) || DEFAULT_GEMINI_MODEL };
  const claude = await getSecret("ANTHROPIC_API_KEY");
  if (claude) return { provider: "anthropic" as const, key: claude, model: (await getSecret("CHAT_MODEL")) || DEFAULT_CLAUDE_MODEL };
  return null;
}

// One answer from the configured AI. `history` must start with a visitor message.
export async function askAi(system: string, history: ChatMsg[], maxTokens = 500): Promise<AiResult> {
  const p = await chatProvider();
  if (!p) return { ok: false, error: "not_configured" };
  try {
    if (p.provider === "gemini") {
      const call = (model: string, think = true) =>
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": p.key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
            generationConfig: {
              // Newer models think first and that counts against this limit, so they get room; the prompt keeps replies short.
              maxOutputTokens: /^gemini-2\.5/.test(model) ? maxTokens : Math.max(maxTokens, 2048),
              temperature: 0.6,
              // 2.5 models "think" before answering by default; a chat reply doesn't need it and it would eat the token budget.
              // Newer models: think as little as possible, so a chat answer comes in a few seconds.
              ...(/^gemini-2\.5/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : think && !/^gemini-(1|2\.0)/.test(model) ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
            },
          }),
          signal: AbortSignal.timeout(20000),
        });
      let model = geminiFallback && p.model === DEFAULT_GEMINI_MODEL ? geminiFallback : p.model;
      let res = await call(model);
      if (res.status === 404) {
        const other = await findGeminiModel(p.key);
        if (other && other !== model) {
          model = other;
          res = await call(model);
        }
      }
      // A model that doesn't take the "think less" setting: ask again without it.
      if (res.status === 400 && !/^gemini-2\.5/.test(model)) res = await call(model, false);
      // What Google said, for the Test button in Admin → API keys (never shown to visitors).
      const why = async () => `model ${model}: ${String((await res.clone().json().catch(() => ({})))?.error?.message ?? "").slice(0, 200)}`;
      if (res.status === 400 || res.status === 401 || res.status === 403) return { ok: false, error: "rejected", status: res.status, provider: "gemini", detail: await why() };
      if (!res.ok) return { ok: false, error: "upstream", status: res.status, provider: "gemini", detail: await why() };
      const data = await res.json().catch(() => ({}));
      const reply = (data.candidates?.[0]?.content?.parts ?? []).filter((x: { thought?: boolean }) => !x.thought).map((x: { text?: string }) => x.text ?? "").join("").trim();
      return reply
        ? { ok: true, reply, provider: "gemini", model }
        : { ok: false, error: "upstream", provider: "gemini", detail: `model ${model}: empty answer (${data.candidates?.[0]?.finishReason ?? data.promptFeedback?.blockReason ?? "no reason given"})` };
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": p.key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: p.model, max_tokens: maxTokens, system, messages: history }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, error: "rejected", status: res.status, provider: "anthropic" };
    if (!res.ok) return { ok: false, error: "upstream", status: res.status, provider: "anthropic" };
    const data = await res.json().catch(() => ({}));
    const reply = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n").trim();
    return reply ? { ok: true, reply, provider: "anthropic", model: p.model } : { ok: false, error: "upstream", provider: "anthropic" };
  } catch (e) {
    return { ok: false, error: "upstream", provider: p.provider, detail: (e as Error)?.name === "TimeoutError" ? `no answer in time${p.provider === "gemini" ? ` (model ${geminiFallback && p.model === DEFAULT_GEMINI_MODEL ? geminiFallback : p.model})` : ""}` : String((e as Error)?.message ?? e).slice(0, 200) };
  }
}
