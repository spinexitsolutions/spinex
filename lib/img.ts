// Smaller copies of images for small boxes (thumbnails, cards, logos), so phones don't download a 1600 px
// photo to show it at 100 px. Works for uploaded images (/api/files/…) and the site's own photos
// (/images/…). Other links (outside websites, SVG, GIF) are returned unchanged.
export const IMG_WIDTHS = [160, 320, 480, 640, 960, 1280, 1600] as const;

export function sized(src: string | undefined | null, width: number): string {
  const s = String(src ?? "");
  if (!s) return s;
  const w = IMG_WIDTHS.find((x) => x >= width) ?? 1600;
  if (/^\/api\/files\/[a-f0-9]{24}$/i.test(s)) return `${s}?w=${w}`;
  if (/^\/images\/[\w\-/.]+\.(jpe?g|png|webp)$/i.test(s) && !s.includes("..")) return `/api/img?src=${encodeURIComponent(s)}&w=${w}`;
  return s;
}
