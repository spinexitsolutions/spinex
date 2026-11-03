import { getContent } from "@/lib/content-server";
import { getPublishedPosts } from "@/lib/post-db";
import { llmsText } from "@/lib/seo";

// Plain-text guide to the website for AI assistants (ChatGPT, Claude, Perplexity, Gemini). See llmstxt.org.
export const dynamic = "force-dynamic";

export async function GET() {
  const [content, posts] = await Promise.all([getContent(), getPublishedPosts()]);
  return new Response(llmsText(content, posts), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
