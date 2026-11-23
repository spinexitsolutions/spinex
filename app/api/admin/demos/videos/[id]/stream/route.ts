import { guard } from "@/lib/admin-guard";
import { demoOid, streamVideo, videosCol } from "@/lib/demos-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The owner's own preview of a finished demo video.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("demos", "view");
  if (deny) return deny;
  const _id = demoOid(params.id);
  const doc = _id ? await (await videosCol()).findOne({ _id }) : null;
  if (doc?.status !== "ready") return new Response("Not found", { status: 404 });
  return streamVideo(req, String(doc._id));
}
