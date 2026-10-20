import sharp from "sharp";
import { readContentFromDb } from "@/lib/content-server";

// The company logo with its empty transparent border trimmed, made a little darker,
// and resized to a square. Used by the navbar and as the browser favicon.
// /api/brand-icon?size=64&pad=12  (pad = empty space around the logo, in % of the size)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const size = Math.min(512, Math.max(16, Number(url.searchParams.get("size")) || 192));
  const pad = Math.min(30, Math.max(0, Number(url.searchParams.get("pad")) || 0));
  const edge = Math.round((size * pad) / 100);
  const inner = size - edge * 2;
  const { brand } = await readContentFromDb();
  const logo = brand.logo;
  if (!logo) return new Response("No logo set", { status: 404 });

  try {
    const src = logo.startsWith("http") ? logo : new URL(logo, url.origin).href;
    const res = await fetch(src, { cache: "force-cache" });
    if (!res.ok) throw new Error(`Logo download failed (${res.status})`);
    const input = Buffer.from(await res.arrayBuffer());

    const png = await sharp(input)
      .trim({ threshold: 10 }) // cut the empty border around the logo
      .modulate({ brightness: 0.68, saturation: 1.4 }) // darker, richer colour
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: edge, bottom: edge, left: edge, right: edge, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch (e) {
    console.error("brand-icon:", e);
    return Response.redirect(logo.startsWith("http") ? logo : new URL(logo, url.origin).href, 302);
  }
}
