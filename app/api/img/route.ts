import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { imageHeaders, pickWidth, resized } from "@/lib/img-server";

// A smaller copy of one of the site's own photos in /public/images: /api/img?src=/images/…jpg&w=480
export async function GET(req: Request) {
  const u = new URL(req.url);
  const src = u.searchParams.get("src") ?? "";
  const w = pickWidth(u.searchParams.get("w"));
  if (!w || !/^\/images\/[\w\-/.]+\.(jpe?g|png|webp)$/i.test(src) || src.includes("..")) return new Response("Not found", { status: 404 });
  const root = join(process.cwd(), "public");
  const file = normalize(join(root, src));
  if (!file.startsWith(root)) return new Response("Not found", { status: 404 });
  try {
    const buf = await resized(`static:${src}`, () => readFile(file), w);
    return new Response(new Uint8Array(buf), { headers: imageHeaders });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
