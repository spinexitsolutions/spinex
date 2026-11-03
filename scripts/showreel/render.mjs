// Renders reel.html to an MP4, frame by frame.
// node scripts/showreel/render.mjs <wide|tall> <out.mp4> [from=0] [to=30] [fps=30] [assetsDir]
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [v = "wide", out = `showreel-${v}.mp4`, from = "0", to = "30", fpsArg = "30", assets] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const W = v === "tall" ? 1080 : 1920, H = v === "tall" ? 1920 : 1080, fps = Number(fpsArg);
const assetsDir = resolve(assets || resolve(here, "assets"));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const url = `${pathToFileURL(resolve(here, "reel.html")).href}?v=${v}&assets=${encodeURIComponent(pathToFileURL(assetsDir).href)}`;
await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => window.ready);
await page.waitForTimeout(500);

const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error("ffmpeg exit " + c)))));

const n = Math.round((Number(to) - Number(from)) * fps);
for (let i = 0; i < n; i++) {
  const t = Number(from) + i / fps;
  await page.evaluate((t) => window.seek(t), t);
  const buf = await page.screenshot({ type: "jpeg", quality: 93 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 60 === 0) console.log(`${v}: ${i}/${n}`);
}
ff.stdin.end();
await done;
await browser.close();
console.log("wrote", out);
