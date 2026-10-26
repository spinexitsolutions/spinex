import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { getReviewSettings, markClicked } from "@/lib/reviews-db";
import { writeReviewUrl } from "@/lib/reviews";
import { SITE_URL } from "@/lib/site";

const okToken = (t: string) => /^[A-Za-z0-9_-]{10,40}$/.test(t);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// The link in review request emails. It opens a tiny page that notes the visit and goes on to Google's
// "write a review" page. The visit is noted by the page's script, not by opening the link, because
// company email systems open every link in an email to scan it, and that shouldn't count as the client.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  if (!hasDb()) return NextResponse.redirect(SITE_URL);
  const url = writeReviewUrl(await getReviewSettings()) || SITE_URL;
  const token = String(params.token || "");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Opening Google reviews…</title><meta http-equiv="refresh" content="3;url=${esc(url)}">
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f5fa;color:#120f1b}a{color:#6e59d9}</style></head>
<body><p>Opening Google reviews… <a href="${esc(url)}">Tap here</a> if nothing happens.</p>
<script>(function(){var u=${JSON.stringify(url).replace(/</g, "\\u003c")};var go=function(){location.replace(u)};${okToken(token) ? `try{fetch(location.pathname,{method:"POST",keepalive:true}).finally(go)}catch(e){go()}setTimeout(go,1200);` : "go();"}})();</script></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  if (!hasDb()) return NextResponse.json({ ok: false }, { status: 503 });
  const token = String(params.token || "");
  if (okToken(token)) await markClicked(token).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
