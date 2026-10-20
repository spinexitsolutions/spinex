import { getDb, hasDb } from "./db";
import { getSecret } from "./secrets";

export type SpamCheck = { ok: true } | { ok: false; silent: boolean; status: number; error: string };

let indexReady = false;

// Persistent rate limit (works across server restarts and multiple servers).
async function rateLimited(key: string, max: number, windowMs: number) {
  if (!hasDb()) return false;
  const col = (await getDb()).collection<{ key: string; at: Date }>("rate_limits");
  if (!indexReady) {
    await col.createIndex({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 }).catch(() => undefined);
    await col.createIndex({ key: 1, at: -1 }).catch(() => undefined);
    indexReady = true;
  }
  const since = new Date(Date.now() - windowMs);
  const count = await col.countDocuments({ key, at: { $gte: since } });
  if (count >= max) return true;
  await col.insertOne({ key, at: new Date() });
  return false;
}

async function turnstileOk(token: string, ip: string) {
  const secret = await getSecret("TURNSTILE_SECRET_KEY");
  if (!secret) return true; // not set up: skip this check
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return true; // if Cloudflare can't be reached, don't block real customers
  }
}

// Runs every spam check for a public form.
export async function checkHuman(req: Request, f: { website?: unknown; startedAt?: unknown; cfToken?: unknown }, bucket: string, max = 6): Promise<SpamCheck> {
  // 1. Hidden field that only bots fill
  if (String(f.website ?? "")) return { ok: false, silent: true, status: 200, error: "" };
  // 2. Filled faster than a person could
  const started = Number(f.startedAt);
  if (started && Date.now() - started < 2500) return { ok: false, silent: true, status: 200, error: "" };
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  // 3. Cloudflare Turnstile (only when keys are set)
  if (!(await turnstileOk(String(f.cfToken ?? ""), ip))) {
    return { ok: false, silent: false, status: 400, error: "Please complete the quick security check and try again." };
  }
  // 4. Too many sends from one connection
  if (await rateLimited(`${bucket}:${ip}`, max, 10 * 60 * 1000)) {
    return { ok: false, silent: false, status: 429, error: "Too many messages from this connection. Please try again in a few minutes." };
  }
  return { ok: true };
}
