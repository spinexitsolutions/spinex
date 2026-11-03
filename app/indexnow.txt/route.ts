import { indexNowKey } from "@/lib/seo";

// Proves to IndexNow (Bing and others) that this website sends the change notices.
export const dynamic = "force-dynamic";

export async function GET() {
  const key = await indexNowKey();
  if (!key) return new Response("Not set up", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
