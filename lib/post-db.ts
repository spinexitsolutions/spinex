import { unstable_cache } from "next/cache";
import { type Document, type WithId } from "mongodb";
import { getDb, hasDb } from "./db";
import { blankPost, slugify, type Post } from "./posts";

export const postsCol = async () => (await getDb()).collection("posts");

export function toPost(doc: WithId<Document>): Post {
  const { _id, ...rest } = doc;
  return { ...blankPost(), ...(rest as Partial<Post>), id: String(_id) };
}

const TEXT = ["title", "slug", "excerpt", "cover", "coverAlt", "body", "category", "author", "publishedAt", "seoTitle", "seoDescription"] as const;

export function cleanPost(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of TEXT) {
    if (input[k] === undefined) continue;
    out[k] = String(input[k] ?? "").trim().slice(0, k === "body" ? 100000 : k === "excerpt" || k === "seoDescription" ? 400 : 300);
  }
  if (input.tags !== undefined) out.tags = (Array.isArray(input.tags) ? input.tags : String(input.tags).split(",")).map((t) => String(t).trim()).filter(Boolean).slice(0, 15);
  if (input.status !== undefined) out.status = input.status === "published" ? "published" : "draft";
  if (typeof out.slug === "string") out.slug = slugify(out.slug as string);
  if (out.publishedAt && !/^\d{4}-\d{2}-\d{2}$/.test(String(out.publishedAt))) out.publishedAt = "";
  return out;
}

// Makes the slug unique by adding -2, -3 … when needed.
export async function uniqueSlug(base: string, exceptId?: string) {
  const col = await postsCol();
  const root = slugify(base) || "post";
  let slug = root;
  for (let n = 2; ; n++) {
    const hit = await col.findOne({ slug }, { projection: { _id: 1 } });
    if (!hit || String(hit._id) === exceptId) return slug;
    slug = `${root}-${n}`;
  }
}

const today = () => new Date().toISOString().slice(0, 10);

// Throws on a database error so the failure is never cached (see getPublishedPosts).
async function loadPublished(): Promise<Post[]> {
  if (!hasDb()) return [];
  const docs = await (await postsCol()).find({ status: "published", publishedAt: { $lte: today() } }).sort({ publishedAt: -1, createdAt: -1 }).limit(500).toArray();
  return docs.map(toPost);
}

// Cached for visitors; saving a post in the admin clears the "posts" tag.
const cachedPublished = unstable_cache(loadPublished, ["published-posts"], { tags: ["posts"], revalidate: 3600 });

// On a database error this request shows no posts, and the next request tries the database again.
export async function getPublishedPosts(): Promise<Post[]> {
  try {
    return await cachedPublished();
  } catch (e) {
    console.error("Could not load blog posts:", e);
    return [];
  }
}

export async function getPublishedPost(slug: string) {
  const all = await getPublishedPosts();
  return all.find((p) => p.slug === slug) ?? null;
}
