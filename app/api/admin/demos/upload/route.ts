import { NextResponse } from "next/server";
import { getSession, guard } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { getContent } from "@/lib/content-server";
import { processDemo, saveUploadToTmp, videosCol } from "@/lib/demos-db";
import { MAX_DEMO_BYTES } from "@/lib/demos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The video file is sent as the request body (not a form), so a large file is written straight to disk.
// The watermark is added in the background; the list shows "Processing" until it is ready.
export async function POST(req: Request) {
  const deny = await guard("demos");
  if (deny) return deny;
  if (!req.body) return NextResponse.json({ error: "No video was sent." }, { status: 400 });
  const type = req.headers.get("content-type") || "";
  if (!/^video\//.test(type)) return NextResponse.json({ error: "Please choose a video file (MP4, MOV or WEBM)." }, { status: 400 });
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_DEMO_BYTES) return NextResponse.json({ error: "The video is bigger than 1 GB. Please export a smaller file." }, { status: 413 });
  const title = decodeURIComponent(req.headers.get("x-title") || "").replace(/\s+/g, " ").trim().slice(0, 120) || "Demo video";
  let saved;
  try {
    saved = await saveUploadToTmp(req.body, MAX_DEMO_BYTES);
  } catch (e) {
    const big = e instanceof Error && e.message === "too big";
    return NextResponse.json({ error: big ? "The video is bigger than 1 GB. Please export a smaller file." : "The upload stopped. Please try again." }, { status: big ? 413 : 400 });
  }
  if (saved.size < 1000) return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  const s = await getSession();
  const doc = { title, status: "processing", error: "", duration: 0, width: 0, height: 0, size: 0, burned: false, createdAt: new Date().toISOString(), by: s?.name || s?.email || "" };
  const { insertedId } = await (await videosCol()).insertOne(doc);
  const brand = (await getContent()).brand?.name || "Spinex IT Solutions";
  processDemo(insertedId, saved.file, brand);
  await logActivity(s, "Demo videos", `Uploaded "${title}"`, "", req);
  return NextResponse.json({ id: String(insertedId) });
}
