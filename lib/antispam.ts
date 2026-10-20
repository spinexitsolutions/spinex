import { getDb, hasDb } from "./db";
import { getSecret } from "./secrets";

export type SpamCheck = { ok: true } | { ok: false; silent: boolean; status: number; error: string };

let indexReady = false;

// The visitor's IP address as seen by the server (first entry of x-forwarded-for on Vercel).
export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

async function limitsCol() {
  const col = (await getDb()).collection<{ key: string; at: Date }>("rate_limits");
  if (!indexReady) {
    await col.createIndex({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 }).catch(() => undefined);
    await col.createIndex({ key: 1, at: -1 }).catch(() => undefined);
    indexReady = true;
  }
  return col;
}

// How many times `key` was recorded in the last `windowMs` (0 without a database).
export async function recentHits(key: string, windowMs: number) {
  if (!hasDb()) return 0;
  return (await limitsCol()).countDocuments({ key, at: { $gte: new Date(Date.now() - windowMs) } });
}

// Records one use of `key` (for example a failed login).
export async function recordHit(key: string) {
  if (!hasDb()) return;
  await (await limitsCol()).insertOne({ key, at: new Date() });
}

// Persistent rate limit (works across server restarts and multiple servers).
// Returns true when `key` has already been used `max` times in the last `windowMs`; otherwise records this use.
export async function rateLimited(key: string, max: number, windowMs: number) {
  if (!hasDb()) return false;
  if ((await recentHits(key, windowMs)) >= max) return true;
  await recordHit(key);
  return false;
}

async function turnstileOk(token: string, ip: string) {
  const secret = await getSecret("TURNSTILE_SECRET_KEY");
  // Only enforce when both keys are set; with just one, the form can't show (or check) the widget.
  if (!secret || !(await getSecret("TURNSTILE_SITE_KEY"))) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
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
  const ip = clientIp(req);
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
