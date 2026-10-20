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

// Content plus the time it was last saved (ISO string, "" when never saved or no database).
// Used by the admin panel to notice when someone else saved in the meantime. Throws on a database error,
// so the admin never starts editing (and then saves over) built-in defaults by mistake.
export async function readContentDoc(): Promise<{ content: SiteContent; updatedAt: string }> {
  if (!hasDb()) return { content: defaultContent, updatedAt: "" };
  const db = await getDb();
  const doc = await db.collection<SettingsDoc>("settings").findOne({ _id: "content" });
  return { content: doc ? mergeContent(defaultContent, doc.data) : defaultContent, updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : "" };
}

// Only the raw saved data is cached; it is merged with the built-in defaults on every request,
// so new defaults in code (like new services) show up without clearing any cache.
// The admin save clears the "content" tag so changes go live at once.
// A database error is thrown (not returned), so the failure is never cached and the next request tries again.
const readSavedContent = unstable_cache(
  async (): Promise<Partial<SiteContent> | null> => {
    if (!hasDb()) return null;
    const db = await getDb();
    const doc = await db.collection<SettingsDoc>("settings").findOne({ _id: "content" });
    return doc?.data ? JSON.parse(JSON.stringify(doc.data)) : null;
  },
  ["site-content-raw"],
  { tags: ["content"], revalidate: 300 },
);

export async function getContent(): Promise<SiteContent> {
  try {
    const saved = await readSavedContent();
    return saved ? mergeContent(defaultContent, saved) : defaultContent;
  } catch (e) {
    console.error("Could not load site content, using defaults for this request:", e);
    return defaultContent;
  }
}

type VersionDoc = { data: Partial<SiteContent>; savedAt: Date; note: string };
const KEEP_VERSIONS = 40;

// Thrown by saveContent when someone else saved after the admin opened the panel.
export class ContentConflictError extends Error {
  constructor() {
    super("Someone else saved changes since you opened the panel. Reload to see them, then make your edit again.");
    this.name = "ContentConflictError";
  }
}

// Saves content and keeps the previous copy in "content_versions" so it can be restored.
// baseUpdatedAt: the save time the admin's copy was loaded at. When given (non-empty) and the stored
// content was saved at a different time, nothing is written and ContentConflictError is thrown.
// Returns the new save time as an ISO string.
export async function saveContent(data: SiteContent, note = "Saved", baseUpdatedAt?: string): Promise<string> {
  const db = await getDb();
  const settings = db.collection<SettingsDoc>("settings");
  const current = await settings.findOne({ _id: "content" });
  const currentAt = current?.updatedAt ? new Date(current.updatedAt).toISOString() : "";
  if (baseUpdatedAt !== undefined && baseUpdatedAt !== currentAt) throw new ContentConflictError();

  const now = new Date();
  if (current) {
    // Only write if nobody saved between our read and this write.
    const res = await settings.updateOne({ _id: "content", updatedAt: current.updatedAt ?? null }, { $set: { data, updatedAt: now } });
    if (!res.matchedCount) throw new ContentConflictError();
  } else {
    try {
      await settings.insertOne({ _id: "content", data, updatedAt: now });
    } catch (e) {
      if ((e as { code?: number }).code === 11000) throw new ContentConflictError(); // saved by someone else at the same moment
      throw e;
    }
  }

  // Keep the previous copy. The new content is already saved, so a problem here is only logged.
  if (current?.data) {
    try {
      const versions = db.collection<VersionDoc>("content_versions");
      await versions.insertOne({ data: current.data, savedAt: current.updatedAt ?? now, note });
      const old = await versions.find({}, { projection: { _id: 1 } }).sort({ savedAt: -1 }).skip(KEEP_VERSIONS).toArray();
      if (old.length) await versions.deleteMany({ _id: { $in: old.map((o) => o._id) } });
    } catch (e) {
      console.error("Could not keep the previous content version:", e);
    }
  }
  return now.toISOString();
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
