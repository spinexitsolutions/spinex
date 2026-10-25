// End-to-end check of the client portal on GitHub (real MongoDB, real browser).
// Seeds made-up data, logs in as a client and as the owner, checks access rules and saves screenshots.
// Usage: node scripts/portal-e2e.mjs http://localhost:3200 /tmp/portal
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { MongoClient, GridFSBucket, ObjectId } from "mongodb";
import { chromium } from "playwright";

const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const report = [];
const ok = (name, pass, extra = "") => report.push(`${pass ? "PASS" : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`);
const hash = (v) => createHash("sha256").update(`${process.env.AUTH_SECRET}:${v}`).digest("hex");

process.on("unhandledRejection", (e) => { report.push(`FAIL crashed (${String(e).slice(0, 400)})`); writeFileSync(`${out}/report.txt`, report.join("\n") + "\n"); process.exit(1); });
const mongo = await MongoClient.connect(process.env.MONGODB_URI);
const db = mongo.db(process.env.MONGODB_DB || undefined);
const now = new Date();
const iso = (d) => new Date(now.getTime() + d * 864e5).toISOString().slice(0, 10);

// ---- Seed ----
const inv = { type: "invoice", number: "INV/2026-27/014", date: iso(-6), dueDate: iso(4), status: "partly-paid", client: { name: "Rahul Sharma", company: "Sharma Traders", phone: "9876543210", email: "rahul@sharmatraders.test", address: "Johari Bazar, Jaipur", state: "Rajasthan", gstin: "" }, items: [{ id: "i1", description: "E-commerce website (50% advance)", sac: "998314", qty: 1, rate: 30000, gst: 18 }], discount: 0, notes: "", terms: "", paid: 17700, leadId: "", fromQuote: "", fromQuoteNumber: "", invoiceId: "", shareToken: "e2eShareTokenSharmaTraders01", signers: null, createdBy: "E2E", createdAt: now.toISOString(), updatedAt: now.toISOString() };
const quote = { ...inv, type: "quote", number: "QT/2026-27/009", status: "accepted", paid: 0, date: iso(-20), shareToken: "e2eShareTokenSharmaQuote001" };
const { insertedIds: billIds } = await db.collection("billing").insertMany([inv, quote]);
const stages = [["Requirements", "done", iso(-20)], ["Design", "done", iso(-10)], ["Development", "current", ""], ["Testing", "todo", iso(8)], ["Go live", "todo", iso(12)]].map(([title, status, date], i) => ({ id: `s${i}`, title, status, date }));
const client = {
  name: "Rahul Sharma", company: "Sharma Traders", email: "rahul@sharmatraders.test", phone: "9876543210", active: true, tokenVersion: 0,
  projects: [{
    id: "p1", title: "E-commerce website", type: "Shopify store", status: "active", startDate: iso(-22), dueDate: iso(12),
    nextStep: "Please send product photos and prices for the remaining 40 products by Friday.",
    stages,
    updates: [
      { id: "u1", at: new Date(now.getTime() - 2 * 864e5).toISOString(), text: "Home page and product pages are ready on the test website. Please check them on your phone.", by: "Amit Jain" },
      { id: "u2", at: new Date(now.getTime() - 10 * 864e5).toISOString(), text: "Design approved. Development has started.", by: "Neha Verma" },
    ],
    links: [{ id: "l1", label: "Test website", url: "https://example.com" }],
  }, {
    id: "p2", title: "Google Business Profile", type: "Local SEO", status: "completed", startDate: iso(-60), dueDate: iso(-40), nextStep: "",
    stages: stages.map((s) => ({ ...s, status: "done" })), updates: [], links: [],
  }],
  billingIds: billIds ? Object.values(billIds).map(String) : [], notes: "Prefers WhatsApp", lastLoginAt: "", invitedAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString(),
};
const { insertedId: cid } = await db.collection("portal_clients").insertOne(client);
const { _id: _skip, ...clientBase } = client;
const { insertedId: otherId } = await db.collection("portal_clients").insertOne({ ...clientBase, name: "Other Client", company: "Other Co", email: "other@client.test", projects: [], billingIds: [] });
const bucket = new GridFSBucket(db, { bucketName: "portal_files" });
const put = (name, meta, body) => new Promise((res, rej) => { const up = bucket.openUploadStream(name, { metadata: meta }); up.on("error", rej).on("finish", () => res(up.id)); up.end(Buffer.from(body)); });
await put("Homepage design v2.pdf", { clientId: String(cid), projectId: "p1", by: "team", byName: "Pooja Sharma", note: "Final design", contentType: "application/pdf" }, "%PDF-1.4 test");
await put("Product list.xlsx", { clientId: String(cid), projectId: "p1", by: "client", byName: "Rahul Sharma", note: "", contentType: "application/vnd.ms-excel" }, "test");
const otherFile = await put("secret.pdf", { clientId: String(otherId), projectId: "", by: "team", byName: "Team", note: "", contentType: "application/pdf" }, "%PDF other");
const t0 = new Date(now.getTime() - 3 * 3600e3).toISOString();
const { insertedId: tid } = await db.collection("portal_tickets").insertOne({ clientId: String(cid), clientName: "Sharma Traders", projectId: "p1", subject: "Change phone number in footer", status: "answered", messages: [{ id: "m1", from: "client", name: "Rahul Sharma", text: "Please change the footer phone number to 98765 11111.", at: t0 }, { id: "m2", from: "team", name: "Amit Jain", text: "Done. It is updated on the test website. Please check.", at: now.toISOString() }], teamUnread: false, clientUnread: true, createdAt: t0, updatedAt: now.toISOString() });
const { insertedId: otherTicket } = await db.collection("portal_tickets").insertOne({ clientId: String(otherId), clientName: "Other Co", projectId: "", subject: "Private", status: "open", messages: [], teamUnread: true, clientUnread: false, createdAt: t0, updatedAt: t0 });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.25 });
const page = await ctx.newPage();
const shot = async (name) => { await page.waitForTimeout(600); await page.screenshot({ path: `${out}/${name}.png`, fullPage: true }); };

try {
  // ---- Not logged in ----
  let r = await page.goto(`${base}/portal`);
  ok("portal redirects to login when logged out", page.url().includes("/portal/login"));
  await shot("01-login");

  // ---- Wrong code ----
  await page.fill('input[type="email"]', "rahul@sharmatraders.test");
  await page.click('button:has-text("Email me a login code")');
  await page.waitForSelector('input[autocomplete="one-time-code"]');
  await page.fill('input[autocomplete="one-time-code"]', "000000");
  await page.click('button:has-text("Log in")');
  await page.waitForSelector('[role="alert"]');
  await page.waitForTimeout(300);
  const alertText = (await page.textContent('[role="alert"]')) || "";
  ok("wrong code is refused", /isn.t right/.test(alertText) && !page.url().endsWith("/portal"), alertText.slice(0, 120));

  // ---- Right code (we write a known code, as if read from the email) ----
  await db.collection("portal_logins").deleteMany({ clientId: String(cid) });
  await db.collection("portal_logins").insertOne({ kind: "code", clientId: String(cid), hash: hash("123456"), attempts: 0, expiresAt: new Date(Date.now() + 6e5) });
  await page.fill('input[autocomplete="one-time-code"]', "123456");
  await page.click('button:has-text("Log in")');
  await page.waitForURL(`${base}/portal`, { timeout: 15000 });
  ok("client logs in with the emailed code", true);
  const used = await db.collection("portal_logins").countDocuments({ clientId: String(cid) });
  ok("code works only once", used === 0);
  await shot("02-overview");
  ok("overview shows the project", (await page.content()).includes("E-commerce website"));

  await page.goto(`${base}/portal/files`); await shot("03-files");
  ok("files page lists shared file", (await page.content()).includes("Homepage design v2.pdf"));
  await page.goto(`${base}/portal/invoices`); await shot("04-invoices");
  ok("invoices page shows the invoice", (await page.content()).includes("INV/2026-27/014"));
  await page.goto(`${base}/portal/support`); await shot("05-support");
  await page.goto(`${base}/portal/support?t=${tid}`); await shot("06-ticket");
  ok("ticket thread opens", (await page.content()).includes("footer phone number"));

  // ---- Access rules ----
  r = await page.request.get(`${base}/api/portal/files/${otherFile}`);
  ok("client can't download another client's file", r.status() === 404, `status ${r.status()}`);
  r = await page.request.post(`${base}/api/portal/tickets/${otherTicket}`, { data: { message: "hi" } });
  ok("client can't reply to another client's ticket", r.status() === 404, `status ${r.status()}`);
  r = await page.request.get(`${base}/api/admin/clients`);
  ok("client cookie can't open admin API", r.status() === 401, `status ${r.status()}`);
  r = await page.request.post(`${base}/api/portal/tickets`, { data: { subject: "E2E question", message: "Can we add a size chart?", projectId: "p1" } });
  ok("client can open a support request", r.status() === 201, `status ${r.status()}`);
  const own = (await db.collection("portal_files.files").find({ "metadata.clientId": String(cid) }).toArray())[0];
  r = await page.request.get(`${base}/api/portal/files/${own._id}`);
  ok("client downloads own file as attachment", r.status() === 200 && /attachment/.test(r.headers()["content-disposition"] || ""), `status ${r.status()}`);

  // ---- Switching the client off ends the session ----
  await db.collection("portal_clients").updateOne({ _id: cid }, { $set: { active: false } });
  await page.goto(`${base}/portal`);
  ok("switched-off client is logged out", page.url().includes("/portal/login"));
  await db.collection("portal_clients").updateOne({ _id: cid }, { $set: { active: true } });

  // ---- Phone view ----
  await db.collection("portal_logins").insertOne({ kind: "code", clientId: String(cid), hash: hash("654321"), attempts: 0, expiresAt: new Date(Date.now() + 6e5) });
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pp = await phone.newPage();
  const rr = await pp.request.post(`${base}/api/portal/login/verify`, { data: { email: "rahul@sharmatraders.test", code: "654321" } });
  ok("login API works", rr.status() === 200, `status ${rr.status()}`);
  await pp.goto(`${base}/portal`); await pp.waitForTimeout(600);
  await pp.screenshot({ path: `${out}/07-phone.png`, fullPage: false });

  // ---- Admin side ----
  const admin = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.25 });
  const ap = await admin.newPage();
  await ap.goto(`${base}/admin/login`, { waitUntil: "networkidle" });
  await ap.fill('input[type="email"]', process.env.ADMIN_EMAIL);
  await ap.fill('input[type="password"]', process.env.ADMIN_PASSWORD);
  await ap.click('button:has-text("Log in")');
  await ap.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 20000 });
  ok("owner logs in to admin", true);
  await ap.goto(`${base}/admin#clients`); await ap.waitForTimeout(2500);
  await ap.screenshot({ path: `${out}/08-admin-list.png`, fullPage: true });
  await ap.goto(`${base}/admin/clients/${cid}`); await ap.waitForSelector("text=Stages", { timeout: 15000 }); await ap.waitForTimeout(800);
  await ap.screenshot({ path: `${out}/09-admin-client.png`, fullPage: true });
  await ap.goto(`${base}/admin/clients/${cid}?tab=support`); await ap.waitForTimeout(1500);
  await ap.screenshot({ path: `${out}/10-admin-support.png`, fullPage: true });
  r = await ap.request.post(`${base}/api/admin/clients/${cid}/access`, { data: { action: "link" } });
  const link = (await r.json()).url;
  ok("admin makes a one-time login link", r.status() === 200 && /\/portal\/magic\?t=/.test(link || ""));
  const fresh = await browser.newContext();
  const fp = await fresh.newPage();
  const t = new URL(link).searchParams.get("t");
  let m = await fp.request.post(`${base}/api/portal/magic`, { data: { t } });
  ok("one-time link logs in", m.status() === 200, `status ${m.status()}`);
  m = await fp.request.post(`${base}/api/portal/magic`, { data: { t } });
  ok("one-time link can't be used twice", m.status() === 400, `status ${m.status()}`);
  r = await ap.request.post(`${base}/api/admin/clients/tickets/${tid}`, { data: { message: "We have added it. Please check." } });
  ok("admin replies to a ticket", r.status() === 200, `status ${r.status()}`);
} catch (e) {
  ok("run", false, String(e).slice(0, 300));
  for (const pg of ctx.pages().concat(browser.contexts().flatMap((c) => c.pages()))) await pg.screenshot({ path: `${out}/error-${Math.random().toString(36).slice(2, 6)}.png`, fullPage: true }).catch(() => undefined);
}
await browser.close();
await mongo.close();
writeFileSync(`${out}/report.txt`, report.join("\n") + "\n");
console.log(report.join("\n"));
