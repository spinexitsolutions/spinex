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
  // Field by field, so two jobs writing at the same time don't undo each other.
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const [k, v] of Object.entries(patch)) set[`value.${k}`] = v;
  await (await col()).updateOne({ _id: `state:${id}` }, { $set: set }, { upsert: true });
}

// Sets state key to value only if it isn't that already, in one step. Returns true for exactly one caller,
// so two scheduler calls at the same moment can't both start the same daily job.
export async function claimState(id: string, key: string, value: string) {
  try {
    const r = await (await col()).updateOne({ _id: `state:${id}`, [`value.${key}`]: { $ne: value } }, { $set: { [`value.${key}`]: value, updatedAt: new Date().toISOString() } }, { upsert: true });
    return r.modifiedCount > 0 || r.upsertedCount > 0;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return false; // the other call won
    throw e;
  }
}
