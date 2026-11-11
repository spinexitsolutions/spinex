// Server only. Resizes an image to a given width (WebP) and keeps recent results in memory.
import sharp from "sharp";
import { IMG_WIDTHS } from "./img";

const cache = new Map<string, Buffer>();
let cacheBytes = 0;
const MAX_BYTES = 48 * 1024 * 1024;

export function pickWidth(raw: string | null): number | null {
  const n = Number(raw);
  return (IMG_WIDTHS as readonly number[]).includes(n) ? n : null;
}

export async function resized(key: string, input: () => Promise<Buffer>, width: number): Promise<Buffer> {
  const k = `${key}@${width}`;
  const hit = cache.get(k);
  if (hit) {
    cache.delete(k);
    cache.set(k, hit); // most recently used last
    return hit;
  }
  const out = await sharp(await input(), { failOn: "none" }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: width >= 1600 ? 88 : 78 }).toBuffer();
  cache.set(k, out);
  cacheBytes += out.length;
  for (const [old, buf] of cache) {
    if (cacheBytes <= MAX_BYTES) break;
    cache.delete(old);
    cacheBytes -= buf.length;
  }
  return out;
}

export const imageHeaders = { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" };
