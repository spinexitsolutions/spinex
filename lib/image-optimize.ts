// Server only. Makes uploaded photos smaller so pages load faster on phones:
// turns them the right way up, shrinks anything bigger than 2000 px and saves as WebP (also keeps transparency).
// GIFs are left alone (they may be animated). If anything fails, the original file is kept.

const MAX_SIDE = 2000;
const CAN_OPTIMIZE = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export type Optimized = { buf: Buffer; type: string; name: string; changed: boolean };

export async function optimizeImage(buf: Buffer, type: string, name: string): Promise<Optimized> {
  const same = { buf, type, name, changed: false };
  if (!CAN_OPTIMIZE.includes(type)) return same;
  try {
    const sharp = (await import("sharp")).default;
    const img = sharp(buf, { failOn: "none" });
    const meta = await img.metadata();
    if ((meta.pages ?? 1) > 1) return same; // animated WebP
    const big = (meta.width ?? 0) > MAX_SIDE || (meta.height ?? 0) > MAX_SIDE;
    const out = await img
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    // Keep the original when it was already small and our version isn't really smaller.
    if (!big && out.length >= buf.length * 0.9) return same;
    const webpName = name.replace(/\.(jpe?g|png|webp|avif)$/i, "") + ".webp";
    return { buf: out, type: "image/webp", name: webpName, changed: true };
  } catch (e) {
    console.error("Image optimise skipped:", e);
    return same;
  }
}
