// Downloads every stock photo the site uses into public/images/stock,
// then swaps any Unsplash links saved in the database (Admin content) for local paths.
// Run from the project folder:  npm run offline-images
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "public", "images", "stock");
fs.mkdirSync(DIR, { recursive: true });

const BUILT_IN = [
  "photo-1441986300917-64674bd600d8", "photo-1460925895917-afdab827c52f", "photo-1497366216548-37526070297c",
  "photo-1498050108023-c5249f4df085", "photo-1504384308090-c894fdcc538d", "photo-1505740420928-5e560c06d30e",
  "photo-1512941937669-90a1b58e7e9c", "photo-1519389950473-47ba0277781c", "photo-1522071820081-009f0129c71c",
  "photo-1523275335684-37898b6baf30", "photo-1531297484001-80022131f5a1", "photo-1542291026-7eec264c27ff",
  "photo-1542744173-8e7e53415bb0", "photo-1551288049-bebda4e38f71", "photo-1556742049-0cfed4f6a45d",
  "photo-1556761175-5973dc0f32e7", "photo-1559136555-9303baea8ebd", "photo-1561070791-2526d30994b5",
  "photo-1574717024653-61fd2cf4d44d", "photo-1611162617474-5b21e879e113",
];

// Stops at quotes, spaces, ")" and backslashes (the text searched is JSON, where a quote appears as \").
const UNSPLASH = /https:\/\/images\.unsplash\.com\/(photo-[0-9]+-[0-9a-f]+)[^"'\s)\\]*/g;

async function download(id) {
  const file = path.join(DIR, `${id}.jpg`);
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) return "kept";
  const url = `https://images.unsplash.com/${id}?w=1600&q=80&fm=jpg&fit=max`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) }); // give up on a stuck download
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return "downloaded";
}

function readEnv() {
  const env = {};
  const f = path.join(ROOT, ".env.local");
  if (!fs.existsSync(f)) return env;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

async function main() {
  console.log("1) Downloading built-in photos to public/images/stock …");
  let failed = 0;
  const problems = [];
  for (const id of BUILT_IN) {
    try {
      console.log(`   ${await download(id)}  ${id}.jpg`);
    } catch (e) {
      failed++;
      problems.push(`${id}.jpg (${e.message})`);
      console.log(`   FAILED  ${id}  (${e.message})`);
    }
  }

  const env = readEnv();
  if (!env.MONGODB_URI) {
    console.log("\n2) No MONGODB_URI in .env.local, skipping the database step.");
  } else {
    console.log("\n2) Replacing Unsplash links saved in the database …");
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    try {
      await client.connect();
      const col = client.db(env.MONGODB_DB || "spinex").collection("settings");
      const doc = await col.findOne({ _id: "content" });
      if (!doc) {
        console.log("   Nothing saved from Admin yet, so nothing to replace.");
      } else {
        const text = JSON.stringify(doc.data);
        const ids = [...new Set([...text.matchAll(UNSPLASH)].map((m) => m[1]))];
        for (const id of ids) {
          try {
            console.log(`   ${await download(id)}  ${id}.jpg`);
          } catch (e) {
            failed++;
            problems.push(`${id}.jpg (${e.message})`);
            console.log(`   FAILED  ${id}  (${e.message})`);
          }
        }
        let count = 0;
        const replaced = text.replace(UNSPLASH, (m, id) => {
          if (!fs.existsSync(path.join(DIR, `${id}.jpg`))) return m;
          count++;
          return `/images/stock/${id}.jpg`;
        });
        if (!count) {
          console.log("   No Unsplash links to replace in the saved website content.");
        } else {
          // Only write if nobody saved from Admin since we read it (same updatedAt), so no edit is lost.
          const res = await col.updateOne(
            { _id: "content", updatedAt: doc.updatedAt ?? null },
            { $set: { data: JSON.parse(replaced), updatedAt: new Date() } },
          );
          if (res.matchedCount) console.log(`   Updated ${count} image link${count === 1 ? "" : "s"} in the saved website content.`);
          else {
            console.warn("   WARNING: the website content was saved by someone else meanwhile, so it was not changed. Run this again.");
          }
        }
      }
    } catch (e) {
      failed++;
      problems.push(`database step (${e.message})`);
      console.log(`   Database step failed: ${e.message}`);
    } finally {
      await client.close().catch(() => undefined);
    }
  }

  if (failed) {
    // Exit normally so a hosting build (e.g. Vercel) isn't stopped, but make the problem easy to spot in the log.
    console.warn(`\n!!! WARNING: ${failed} problem(s). These images will be MISSING on the website until this runs successfully:`);
    for (const p of problems) console.warn(`    - ${p}`);
    console.warn("    Check the internet connection and run: npm run offline-images\n");
  } else {
    console.log("\nAll images are now stored with the website. Restart: npm run dev");
  }
}

main().catch((e) => {
  // Never block the build; just report it.
  console.warn(`\n!!! WARNING: offline-images stopped early (${e.message}). Some images may be missing on the website.`);
});
