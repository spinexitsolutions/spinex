// Used by the GitHub build check: opens the sample of every HR letter type, saves a PDF and a picture
// of each, and reports how many A4 pages each PDF has (every letter should be exactly 1 page).
// Usage: node scripts/letter-check.mjs http://localhost:3100 /tmp/letters
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const src = readFileSync(new URL("../lib/letters.ts", import.meta.url), "utf8");
const block = src.slice(src.indexOf("export const LETTER_TEMPLATES"), src.indexOf("export const LETTER_TYPES"));
const types = [...block.matchAll(/^ {2}(\w+): \{$/gm)].map((m) => m[1]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1240, height: 1400 }, deviceScaleFactor: 1.5 });
const report = [];
let bad = 0;
for (const type of types) {
  try {
    await page.goto(`${base}/letter-samples?type=${type}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".letter-page, .cert-page");
    await page.evaluate(() => document.fonts.ready);
    const el = await page.$(".letter-page, .cert-page");
    await el.screenshot({ path: `${out}/${type}.png` });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    await page.emulateMedia({ media: "screen" });
    writeFileSync(`${out}/${type}.pdf`, pdf);
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) || []).length;
    if (pages !== 1) bad++;
    report.push(`${pages === 1 ? "OK  " : "LONG"} ${type} pages=${pages}`);
  } catch (e) {
    bad++;
    report.push(`FAIL ${type} ${String(e).slice(0, 200)}`);
  }
}
// The printable guide (any number of pages).
try {
  await page.goto(`${base}/letter-guide`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  writeFileSync(`${out}/guide.pdf`, pdf);
  report.push(`guide pages=${(pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) || []).length}`);
} catch (e) {
  report.push(`guide FAIL ${String(e).slice(0, 200)}`);
}
await browser.close();
report.push(`types=${types.length} not_one_page=${bad}`);
writeFileSync(`${out}/report.txt`, report.join("\n") + "\n");
console.log(report.join("\n"));
