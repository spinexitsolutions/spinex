// Server only. Private settings that must never reach the public website
// (bank details, backup email, automation state). Website content is sent to every visitor, so these live here instead.
import { getDb } from "./db";

type SettingsDoc = { _id: string; value: Record<string, unknown>; updatedAt?: string };

const col = async () => (await getDb()).collection<SettingsDoc>("settings");

export async function readSetting<T extends object>(id: string, defaults: T): Promise<T> {
  const doc = await (await col()).findOne({ _id: id });
  const saved = (doc?.value ?? {}) as Record<string, unknown>;
  const out = { ...defaults } as Record<string, unknown>;
  // Keep only known fields with the same kind of value as the default.
  for (const [k, def] of Object.entries(defaults as Record<string, unknown>)) {
    const v = saved[k];
    if (v === undefined || v === null) continue;
    if (typeof def === "number") out[k] = Number.isFinite(Number(v)) ? Number(v) : def;
    else if (typeof def === "boolean") out[k] = !!v;
    else if (typeof def === "string") out[k] = String(v);
    else if (def && typeof def === "object" && v && typeof v === "object") out[k] = v;
  }
  return out as T;
}

export async function writeSetting<T extends object>(id: string, defaults: T, input: Record<string, unknown>): Promise<T> {
  const clean = { ...(await readSetting(id, defaults)) } as Record<string, unknown>;
  for (const [k, def] of Object.entries(defaults as Record<string, unknown>)) {
    if (!(k in input)) continue;
    const v = input[k];
    if (typeof def === "number") clean[k] = Number.isFinite(Number(v)) ? Number(v) : def;
    else if (typeof def === "boolean") clean[k] = !!v;
    else if (typeof def === "string") clean[k] = String(v ?? "").slice(0, 4000);
    else if (Array.isArray(def) && Array.isArray(v)) clean[k] = v; // lists are checked by the caller
  }
  await (await col()).updateOne({ _id: id }, { $set: { value: clean, updatedAt: new Date().toISOString() } }, { upsert: true });
  return clean as T;
}

// Small state values written by background jobs (last backup time and so on), kept apart from user settings.
export async function readState(id: string): Promise<Record<string, unknown>> {
  return ((await (await col()).findOne({ _id: `state:${id}` }))?.value ?? {}) as Record<string, unknown>;
}
export async function writeState(id: string, patch: Record<string, unknown>) {
  const current = await readState(id);
  await (await col()).updateOne({ _id: `state:${id}` }, { $set: { value: { ...current, ...patch }, updatedAt: new Date().toISOString() } }, { upsert: true });
}
