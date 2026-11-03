import { getContent } from "@/lib/content-server";
import { getPublishedPosts } from "@/lib/post-db";
import { llmsText } from "@/lib/seo";

// Longer version of /llms.txt with service details, features and answers to common questions.
export const dynamic = "force-dynamic";

export async function GET() {
  const [content, posts] = await Promise.all([getContent(), getPublishedPosts()]);
  return new Response(llmsText(content, posts, true), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
