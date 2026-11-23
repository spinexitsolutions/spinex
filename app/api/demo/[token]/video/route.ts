import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { hasDb } from "@/lib/db";
import { checkPass, demoOid, linksCol, passCookie, streamVideo, videosCol } from "@/lib/demos-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const no = () => new Response("Not available", { status: 403, headers: { "Cache-Control": "no-store" } });

// The video itself, only for the browser that pressed Play on this link, and only inside the player
// (opening this address in a tab or from another site is refused).
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = String(params.token || "");
  if (!hasDb() || !/^[A-Za-z0-9_-]{8,40}$/.test(token)) return no();
  const site = req.headers.get("sec-fetch-site");
  const dest = req.headers.get("sec-fetch-dest");
  if ((site && site !== "same-origin") || (dest && dest !== "video" && dest !== "audio" && dest !== "empty")) return no();
  if (!(await checkPass(cookies().get(passCookie(token))?.value, token))) return no();
  const link = await (await linksCol()).findOne({ token });
  if (!link || link.revoked) return no();
  const vid = demoOid(String(link.videoId));
  const video = vid ? await (await videosCol()).findOne({ _id: vid }) : null;
  if (!video?.fileId) return new Response("Not found", { status: 404 });
  return streamVideo(req, video.fileId as ObjectId);
}
