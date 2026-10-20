// Server only: never import this from a client component.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getDb, hasDb } from "./db";
import { CUSTOM_PREFIX, HEAD_CODE, KNOWN_KEYS, isKnownKey, validCustomName, type KeyStatus, type SecretsView } from "./secret-keys";

// API keys saved from Admin → API keys. Stored encrypted (AES-256-GCM, key derived from AUTH_SECRET)
// in the "secrets" collection. A value saved in the admin panel wins over the same name in .env.local.

type Doc = { _id: string; values: Record<string, string>; updatedAt?: Date };

const keyBytes = () => createHash("sha256").update(`spinex-secrets:${process.env.AUTH_SECRET || ""}`).digest();
export const canEncrypt = () => (process.env.AUTH_SECRET || "").length >= 32;

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${data.toString("base64")}`;
}

export function decrypt(stored: string) {
  try {
    const [v, iv, tag, data] = stored.split(":");
    if (v !== "v1") return "";
    const d = createDecipheriv("aes-256-gcm", keyBytes(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
  } catch {
    return ""; // AUTH_SECRET changed: the value can't be read and must be saved again
  }
}

let cache: { at: number; values: Record<string, string> } | null = null;
const TTL = 30_000;

async function readAll(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL) return cache.values;
  let values: Record<string, string> = {};
  if (hasDb() && canEncrypt()) {
    try {
      const doc = await (await getDb()).collection<Doc>("secrets").findOne({ _id: "keys" });
      for (const [k, v] of Object.entries((doc?.values ?? {}) as Record<string, string>)) {
        const plain = decrypt(v);
        if (plain) values[k] = plain;
      }
    } catch (e) {
      console.error("Could not read API keys from the database:", e);
      // Use the last good values and try the database again in 10 seconds (not on every call,
      // so a database outage doesn't slow down every page and form).
      const fallback = cache?.values ?? {};
      cache = { at: Date.now() - TTL + 10_000, values: fallback };
      return fallback;
    }
  }
  cache = { at: Date.now(), values };
  return values;
}

const ENV_ALIASES: Record<string, string[]> = { TURNSTILE_SITE_KEY: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY"] };
const tidy = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");

function fromEnv(name: string) {
  for (const n of [name, ...(ENV_ALIASES[name] ?? [])]) {
    const v = tidy(process.env[n]);
    if (v) return v;
  }
  return "";
}

// The value to use: admin panel first, then .env.local.
export async function getSecret(name: string): Promise<string> {
  const saved = (await readAll())[name];
  return tidy(saved) || fromEnv(name);
}

// Custom code for public pages, exactly as saved (no trimming of quotes).
export async function getHeadCode() {
  return (await readAll())[HEAD_CODE] ?? "";
}

export async function getCustomSecret(name: string) {
  return getSecret(CUSTOM_PREFIX + name);
}

const mask = (v: string, secret: boolean) => (!v ? "" : !secret ? v : v.length <= 6 ? "••••" : `•••• ${v.slice(-4)}`);

export async function secretsView(): Promise<SecretsView> {
  const saved = await readAll();
  const status = (name: string, secret: boolean): KeyStatus => {
    const admin = tidy(saved[name]);
    const env = fromEnv(name);
    const v = admin || env;
    return { name, set: !!v, source: admin ? "admin" : env ? "env" : "", preview: mask(v, secret) };
  };
  return {
    keys: KNOWN_KEYS.map((k) => status(k.name, !!k.secret)),
    custom: Object.keys(saved).filter((k) => k.startsWith(CUSTOM_PREFIX)).sort().map((k) => ({ ...status(k, true), name: k.slice(CUSTOM_PREFIX.length) })),
    headCode: saved[HEAD_CODE] ?? "",
    canEncrypt: canEncrypt(),
  };
}

// updates: name → new value, or null to remove. Custom names are passed without the CUSTOM_ prefix
// inside `custom`. Unknown names are ignored.
export async function saveSecrets(updates: Record<string, string | null>, custom: Record<string, string | null>, headCode?: string) {
  if (!canEncrypt()) throw new Error("AUTH_SECRET in .env.local must be at least 32 characters to save keys.");
  const col = (await getDb()).collection<Doc>("secrets");
  const doc = await col.findOne({ _id: "keys" });
  const values = { ...(doc?.values ?? {}) };
  const apply = (name: string, v: string | null) => {
    if (v === null) delete values[name];
    else if (v.trim()) values[name] = encrypt(v.trim());
  };
  for (const [k, v] of Object.entries(updates)) if (isKnownKey(k)) apply(k, v);
  for (const [k, v] of Object.entries(custom)) {
    const name = k.trim().toUpperCase();
    if (validCustomName(name)) apply(CUSTOM_PREFIX + name, v);
  }
  if (headCode !== undefined) {
    if (headCode.trim()) values[HEAD_CODE] = encrypt(headCode.slice(0, 20000));
    else delete values[HEAD_CODE];
  }
  await col.updateOne({ _id: "keys" }, { $set: { values, updatedAt: new Date() } }, { upsert: true });
  cache = null;
}
