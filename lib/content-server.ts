import { unstable_cache } from "next/cache";
import { defaultContent, mergeContent, type SiteContent } from "./content";
import { getDb, hasDb } from "./db";

type SettingsDoc = { _id: string; data: Partial<SiteContent>; updatedAt?: Date };

export async function readContentFromDb(): Promise<SiteContent> {
  if (!hasDb()) return defaultContent;
  try {
    const db = await getDb();
    const doc = await db.collection<SettingsDoc>("settings").findOne({ _id: "content" });
    return doc ? mergeContent(defaultContent, doc.data) : defaultContent;
  } catch (e) {
    console.error("Could not load site content, using defaults:", e);
    return defaultContent;
  }
}

// Only the raw saved data is cached; it is merged with the built-in defaults on every request,
// so new defaults in code (like new services) show up without clearing any cache.
// The admin save clears the "content" tag so changes go live at once.
const readSavedContent = unstable_cache(
  async (): Promise<Partial<SiteContent> | null> => {
    if (!hasDb()) return null;
    try {
      const db = await getDb();
      const doc = await db.collection<SettingsDoc>("settings").findOne({ _id: "content" });
      return doc?.data ? JSON.parse(JSON.stringify(doc.data)) : null;
    } catch (e) {
      console.error("Could not load site content, using defaults:", e);
      return null;
    }
  },
  ["site-content-raw"],
  { tags: ["content"] },
);

export async function getContent(): Promise<SiteContent> {
  const saved = await readSavedContent();
  return saved ? mergeContent(defaultContent, saved) : defaultContent;
}

type VersionDoc = { data: Partial<SiteContent>; savedAt: Date; note: string };
const KEEP_VERSIONS = 40;

// Saves content and keeps the previous copy in "content_versions" so it can be restored.
export async function saveContent(data: SiteContent, note = "Saved") {
  const db = await getDb();
  const settings = db.collection<SettingsDoc>("settings");
  const current = await settings.findOne({ _id: "content" });
  if (current?.data) {
    const versions = db.collection<VersionDoc>("content_versions");
    await versions.insertOne({ data: current.data, savedAt: current.updatedAt ?? new Date(), note });
    const old = await versions.find({}, { projection: { _id: 1 } }).sort({ savedAt: -1 }).skip(KEEP_VERSIONS).toArray();
    if (old.length) await versions.deleteMany({ _id: { $in: old.map((o) => o._id) } });
  }
  await settings.updateOne({ _id: "content" }, { $set: { data, updatedAt: new Date() } }, { upsert: true });
}

export async function listVersions() {
  const db = await getDb();
  const docs = await db.collection<VersionDoc>("content_versions").find({}, { projection: { data: 0 } }).sort({ savedAt: -1 }).limit(KEEP_VERSIONS).toArray();
  return docs.map((d) => ({ id: String(d._id), savedAt: d.savedAt.toISOString(), note: d.note }));
}

export async function getVersion(id: string) {
  const { ObjectId } = await import("mongodb");
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  return db.collection<VersionDoc>("content_versions").findOne({ _id: new ObjectId(id) });
}
