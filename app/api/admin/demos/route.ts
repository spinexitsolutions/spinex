import { NextResponse } from "next/server";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { can } from "@/lib/roles";
import { cleanDemoSettings, cleanupDemos, demoStorage, getDemoSettings, linksCol, saveDemoSettings, toLink, toVideo, videosCol } from "@/lib/demos-db";

export const dynamic = "force-dynamic";

// Admin → Demo videos: every video and every client link.
export async function GET() {
  const deny = await guard("demos", "view");
  if (deny) return deny;
  await cleanupDemos().catch(() => 0);
  const [videos, links, settings, storage] = await Promise.all([
    (await videosCol()).find({}).sort({ createdAt: -1 }).limit(300).toArray(),
    (await linksCol()).find({ videoGone: { $ne: true } }).sort({ createdAt: -1 }).limit(1000).toArray(),
    getDemoSettings(),
    demoStorage().catch(() => ({ usedBytes: 0, freeBytes: 0, totalBytes: 0 })),
  ]);
  return NextResponse.json({ videos: videos.map(toVideo), links: links.map(toLink), settings, storage, canEdit: can(await getSession(), "demos", "edit") });
}

// How long new videos are kept on the server before they are removed on their own.
export async function PUT(req: Request) {
  const deny = await guard("demos");
  if (deny) return deny;
  const s = cleanDemoSettings(await jsonBody(req));
  await saveDemoSettings(s);
  return NextResponse.json(s);
}
