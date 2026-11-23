// Server only. Private demo videos: the watermark step (ffmpeg), storage, client links and the short viewing
// pass that lets one browser stream one link's video.
// The video files are kept on the server's disk (DEMO_DIR, a Docker volume), not in the database, so the
// database and its backups stay small. Each video is removed on its own on its "deleteAt" date.
import { spawn, type ChildProcessByStdio } from "child_process";
import { randomBytes } from "crypto";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { GridFSBucket, ObjectId, type Document, type WithId } from "mongodb";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "./db";
import { defaultDemoSettings, type DemoLink, type DemoSettings, type DemoStorage, type DemoVideo } from "./demos";

export const demoOid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
// Only for videos saved by the first version (in the database); new ones are files on disk.
const legacyBucket = async () => new GridFSBucket(await getDb(), { bucketName: "demo_videos" });

// Where the finished videos are kept. On the server this is a Docker volume, so it survives updates.
let dirReady = "";
export async function demoDir() {
  if (dirReady) return dirReady;
  for (const d of [process.env.DEMO_DIR, "/data/demos", path.join(os.tmpdir(), "spinex-demo-files")]) {
    if (!d) continue;
    try {
      await fs.mkdir(d, { recursive: true });
      await fs.access(d, (await import("fs")).constants.W_OK);
      dirReady = d;
      return d;
    } catch {
      /* try the next place */
    }
  }
  throw new Error("No folder to keep demo videos in.");
}
const fileName = (id: string) => `${id.replace(/[^a-f0-9]/gi, "")}.mp4`;
export async function videoPath(id: string) {
  return path.join(await demoDir(), fileName(id));
}

export async function getDemoSettings(): Promise<DemoSettings> {
  const doc = await (await getDb()).collection<{ _id: string; value?: Partial<DemoSettings> }>("settings").findOne({ _id: "demos" });
  return cleanDemoSettings({ ...defaultDemoSettings, ...(doc?.value ?? {}) });
}
export function cleanDemoSettings(v: Partial<DemoSettings>): DemoSettings {
  const k = Math.round(Number(v.keepDays));
  return { keepDays: Number.isFinite(k) ? Math.min(365, Math.max(0, k)) : defaultDemoSettings.keepDays };
}
export async function saveDemoSettings(s: DemoSettings) {
  await (await getDb()).collection<{ _id: string }>("settings").updateOne({ _id: "demos" }, { $set: { value: s, updatedAt: new Date().toISOString() } }, { upsert: true });
}
export const deleteAtFor = (days: number) => (days > 0 ? new Date(Date.now() + days * 864e5).toISOString() : "");

export async function demoStorage(): Promise<DemoStorage> {
  const dir = await demoDir();
  let used = 0;
  for (const f of await fs.readdir(dir).catch(() => [] as string[])) used += (await fs.stat(path.join(dir, f)).catch(() => ({ size: 0 }))).size;
  try {
    const st = await fs.statfs(dir);
    return { usedBytes: used, freeBytes: st.bavail * st.bsize, totalBytes: st.blocks * st.bsize };
  } catch {
    return { usedBytes: used, freeBytes: 0, totalBytes: 0 };
  }
}

// Removes videos whose delete date has passed (with their links). Runs when the admin list opens and
// from the hourly automation, so nothing is left behind.
let lastClean = 0;
export async function cleanupDemos(force = false) {
  if (!force && Date.now() - lastClean < 10 * 60e3) return 0;
  lastClean = Date.now();
  const col = await videosCol();
  const old = await col.find({ deleteAt: { $gt: "", $lt: new Date().toISOString() } }, { projection: { _id: 1 } }).limit(100).toArray();
  for (const v of old) await deleteDemoVideo(v._id);
  return old.length;
}

let ready = false;
async function cols() {
  const db = await getDb();
  const videos = db.collection("demo_videos_meta");
  const links = db.collection("demo_links");
  if (!ready) {
    await links.createIndex({ token: 1 }, { unique: true }).catch(() => undefined);
    await links.createIndex({ videoId: 1 }).catch(() => undefined);
    ready = true;
  }
  return { videos, links };
}
export const videosCol = async () => (await cols()).videos;
export const linksCol = async () => (await cols()).links;

export function toVideo(d: WithId<Document>): DemoVideo {
  const r = d as WithId<Document> & Partial<DemoVideo>;
  // A video still "processing" after 3 hours was cut off by a restart: show it as failed so it can be removed.
  const stuck = r.status === "processing" && Date.now() - Date.parse(String(r.createdAt ?? "")) > 3 * 3600e3;
  return {
    id: String(d._id), title: r.title ?? "", status: stuck ? "failed" : r.status === "ready" || r.status === "failed" ? r.status : "processing",
    error: stuck ? "Processing stopped (the server restarted). Delete it and upload again." : r.error ?? "",
    duration: Number(r.duration) || 0, width: Number(r.width) || 0, height: Number(r.height) || 0, size: Number(r.size) || 0,
    burned: !!r.burned, deleteAt: r.deleteAt ?? "", createdAt: r.createdAt ?? "", by: r.by ?? "",
  };
}
export function toLink(d: WithId<Document>): DemoLink {
  const r = d as WithId<Document> & Partial<DemoLink>;
  return {
    id: String(d._id), videoId: r.videoId ?? "", token: r.token ?? "", client: r.client ?? "", phone: r.phone ?? "", expiresAt: r.expiresAt ?? "",
    maxViews: Number(r.maxViews) || 0, views: Number(r.views) || 0, pin: r.pin ?? "", showName: r.showName !== false, revoked: !!r.revoked,
    createdAt: r.createdAt ?? "", lastViewedAt: r.lastViewedAt ?? "", by: r.by ?? "",
  };
}
export const newDemoToken = () => randomBytes(9).toString("base64url"); // 12 characters

// ---------- Watermark step ----------

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    let out = "", err = "";
    let p: ChildProcessByStdio<null, Readable, Readable>;
    try {
      p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      resolve({ code: -1, out: "", err: String(e) });
      return;
    }
    const t = setTimeout(() => p.kill("SIGKILL"), timeoutMs);
    p.stdout.on("data", (b: Buffer) => { if (out.length < 20000) out += b.toString(); });
    p.stderr.on("data", (b: Buffer) => { err = (err + b.toString()).slice(-4000); });
    p.on("error", (e) => { clearTimeout(t); resolve({ code: -1, out, err: String(e) }); });
    p.on("close", (code) => { clearTimeout(t); resolve({ code: code ?? -1, out, err }); });
  });
}

async function probe(file: string) {
  const r = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file], 60_000);
  if (r.code !== 0) return null;
  try {
    const j = JSON.parse(r.out);
    return { width: Number(j.streams?.[0]?.width) || 0, height: Number(j.streams?.[0]?.height) || 0, duration: Number(j.format?.duration) || 0 };
  } catch {
    return null;
  }
}

const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

// Prints the Spinex watermark into the picture (a corner mark, a large faint mark in the middle and a line at the
// bottom), makes the video at most 1280 px on its long side and puts the index at the start so it plays at once.
async function watermark(input: string, output: string, brand: string) {
  const name = (brand || "Spinex IT Solutions").replace(/[^A-Za-z0-9 &.-]/g, "").trim() || "Spinex IT Solutions";
  const mark = name.split(/\s+/)[0].toUpperCase();
  const font = (await fs.access(FONT).then(() => true, () => false)) ? `fontfile=${FONT}:` : "";
  const dt = (o: string) => `drawtext=${font}${o}`;
  const vf = [
    "scale=w='if(gte(iw,ih),min(1280,iw),-2)':h='if(gte(iw,ih),-2,min(1280,ih))'",
    dt(`text='${mark}':fontcolor=white@0.6:fontsize=h*0.045:x=w-tw-w*0.035:y=h*0.045:shadowcolor=black@0.45:shadowx=2:shadowy=2`),
    dt(`text='${mark}':fontcolor=white@0.14:fontsize=min(w\\,h)*0.2:x=(w-tw)/2:y=(h-th)/2`),
    dt(`text='Sample by ${name}':fontcolor=white@0.5:fontsize=h*0.026:x=w*0.035:y=h-th-h*0.045:shadowcolor=black@0.45:shadowx=1:shadowy=1`),
  ].join(",");
  return run("nice", ["-n", "15", "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", input, "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output], 60 * 60_000);
}

// One video at a time, so several uploads don't slow the website down.
let queue: Promise<void> = Promise.resolve();
export function processDemo(videoId: ObjectId, tmpFile: string, brand: string) {
  queue = queue.then(() => processOne(videoId, tmpFile, brand)).catch((e) => console.error("Demo video processing:", e));
}

async function processOne(videoId: ObjectId, tmpFile: string, brand: string) {
  const col = await videosCol();
  const out = `${tmpFile}-wm.mp4`;
  try {
    const info = await probe(tmpFile);
    if (!info || !info.width) throw new Error("This file isn't a video we can read. Try an MP4 or MOV file.");
    const r = await watermark(tmpFile, out, brand);
    let file = out, burned = true;
    if (r.code !== 0) {
      // ffmpeg missing (e.g. on a laptop): keep the original; the player still shows its moving watermark.
      if (/ENOENT|not found/i.test(r.err)) {
        file = tmpFile;
        burned = false;
      } else {
        throw new Error(`Couldn't add the watermark: ${r.err.split("\n").filter(Boolean).pop()?.slice(0, 160) ?? "unknown error"}`);
      }
    }
    const meta = (burned && (await probe(out))) || info;
    const size = (await fs.stat(file)).size;
    const dest = await videoPath(String(videoId));
    await pipeline(createReadStream(file), createWriteStream(dest));
    await col.updateOne({ _id: videoId }, { $set: { status: "ready", size, burned, width: meta.width, height: meta.height, duration: Math.round(meta.duration), error: "" } });
  } catch (e) {
    await col.updateOne({ _id: videoId }, { $set: { status: "failed", error: e instanceof Error ? e.message : "Processing failed." } });
  } finally {
    await fs.rm(tmpFile, { force: true }).catch(() => undefined);
    await fs.rm(out, { force: true }).catch(() => undefined);
  }
}

export async function saveUploadToTmp(body: ReadableStream<Uint8Array>, max: number) {
  const dir = path.join(os.tmpdir(), "spinex-demos");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${Date.now()}-${randomBytes(4).toString("hex")}`);
  let n = 0;
  const src = Readable.fromWeb(body as unknown as import("stream/web").ReadableStream<Uint8Array>);
  try {
    await pipeline(
      src,
      async function* (chunks: AsyncIterable<Buffer>) {
        for await (const c of chunks) {
          n += c.length;
          if (n > max) throw new Error("too big");
          yield c;
        }
      },
      createWriteStream(file),
    );
  } catch (e) {
    await fs.rm(file, { force: true }).catch(() => undefined);
    throw e;
  }
  return { file, size: n };
}

export async function deleteDemoVideo(id: ObjectId) {
  const { videos, links } = await cols();
  const doc = await videos.findOne({ _id: id });
  if (!doc) return false;
  await fs.rm(await videoPath(String(id)), { force: true }).catch(() => undefined);
  if (doc.fileId) await (await legacyBucket()).delete(doc.fileId as ObjectId).catch(() => undefined);
  // The links stay (turned off), so a client who opens one later sees "removed" instead of an error page.
  await links.updateMany({ videoId: String(id) }, { $set: { revoked: true, videoGone: true } });
  await videos.deleteOne({ _id: id });
  return true;
}

// ---------- Streaming ----------

// Sends the video (or the part the player asked for), never cached and never offered as a download.
export async function streamVideo(req: Request, videoId: string) {
  const file = await videoPath(videoId);
  const st = await fs.stat(file).catch(() => null);
  if (!st) return new Response("Not found", { status: 404 });
  const total = st.size;
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  const send = (start: number, end: number) =>
    new Response(Readable.toWeb(createReadStream(file, { start, end })) as unknown as ReadableStream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) },
    });
  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  // Players always ask for a range; a plain request for the whole file gets only the first part.
  if (!range) return send(0, Math.min(total, 1024 * 1024) - 1);
  let start = range[1] ? Number(range[1]) : NaN, end = range[2] ? Number(range[2]) : NaN;
  if (Number.isNaN(start)) { start = Math.max(0, total - (Number.isNaN(end) ? 0 : end)); end = total - 1; }
  if (Number.isNaN(end) || end >= total) end = total - 1;
  end = Math.min(end, start + 4 * 1024 * 1024 - 1); // at most 4 MB per request
  if (start >= total || start > end) return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${total}` } });
  return send(start, end);
}

// ---------- Viewing pass ----------
// After the client presses Play (and types the PIN, if there is one) the browser gets a pass for this one link,
// good for 3 hours. Reloading the page in that time doesn't use another view.

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "");
export const passCookie = (token: string) => `dv_${token}`;
export const PASS_HOURS = 3;
export async function makePass(token: string, linkId: string) {
  return new SignJWT({ t: token, l: linkId, purpose: "demo" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${PASS_HOURS}h`).sign(secret());
}
export async function checkPass(value: string | undefined, token: string) {
  if (!value || (process.env.AUTH_SECRET || "").length < 32) return false;
  try {
    const { payload } = await jwtVerify(value, secret());
    return payload.purpose === "demo" && payload.t === token;
  } catch {
    return false;
  }
}
