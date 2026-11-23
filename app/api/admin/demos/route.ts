import { NextResponse } from "next/server";
import { getSession, guard } from "@/lib/admin-guard";
import { can } from "@/lib/roles";
import { linksCol, toLink, toVideo, videosCol } from "@/lib/demos-db";

export const dynamic = "force-dynamic";

// Admin → Demo videos: every video and every client link.
export async function GET() {
  const deny = await guard("demos", "view");
  if (deny) return deny;
  const [videos, links] = await Promise.all([
    (await videosCol()).find({}).sort({ createdAt: -1 }).limit(300).toArray(),
    (await linksCol()).find({}).sort({ createdAt: -1 }).limit(1000).toArray(),
  ]);
  return NextResponse.json({ videos: videos.map(toVideo), links: links.map(toLink), canEdit: can(await getSession(), "demos", "edit") });
}
