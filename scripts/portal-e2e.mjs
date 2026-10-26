// End-to-end check of the client portal on GitHub (real MongoDB, real browser).
// Seeds made-up data, logs in as a client and as the owner, checks access rules and saves screenshots.
// Usage: node scripts/portal-e2e.mjs http://localhost:3200 /tmp/portal
import { createHash, createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { MongoClient, GridFSBucket, ObjectId } from "mongodb";
import { chromium } from "playwright";

const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const report = [];
const ok = (name, pass, extra = "") => {
  report.push(`${pass ? "PASS" : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`);
  try { writeFileSync(`${out}/report.txt`, report.join("\n") + "\n"); } catch {}
};
// Never hang the CI job: save what we have and stop after 12 minutes.
setTimeout(() => { report.push("FAIL run (stopped after 24 minutes)"); writeFileSync(`${out}/report.txt`, report.join("\n") + "\n"); process.exit(0); }, 24 * 60e3).unref();
const hash = (v) => createHash("sha256").update(`${process.env.AUTH_SECRET}:${v}`).digest("hex");

process.on("unhandledRejection", (e) => { report.push(`FAIL crashed (${String(e).slice(0, 400)})`); writeFileSync(`${out}/report.txt`, report.join("\n") + "\n"); process.exit(1); });
const mongo = await MongoClient.connect(process.env.MONGODB_URI);
const db = mongo.db(process.env.MONGODB_DB || undefined);
const now = new Date();
const ist = (d) => new Date(Date.now() + 5.5 * 3600e3 + d * 864e5).toISOString().slice(0, 10);
const iso = (d) => new Date(now.getTime() + d * 864e5).toISOString().slice(0, 10);

// ---- Seed ----
const inv = { type: "invoice", number: "INV/2026-27/014", date: iso(-6), dueDate: iso(4), status: "partly-paid", client: { name: "Rahul Sharma", company: "Sharma Traders", phone: "9876543210", email: "rahul@sharmatraders.test", address: "Johari Bazar, Jaipur", state: "Rajasthan", gstin: "" }, items: [{ id: "i1", description: "E-commerce website (50% advance)", sac: "998314", qty: 1, rate: 30000, gst: 18 }], discount: 0, notes: "", terms: "", paid: 17700, leadId: "", fromQuote: "", fromQuoteNumber: "", invoiceId: "", shareToken: "e2eShareTokenSharmaTraders01", signers: null, createdBy: "E2E", createdAt: now.toISOString(), updatedAt: now.toISOString() };
const quote = { ...inv, type: "quote", number: "QT/2026-27/009", status: "accepted", paid: 0, date: iso(-20), shareToken: "e2eShareTokenSharmaQuote001" };
const { insertedIds: billIds } = await db.collection("billing").insertMany([inv, quote]);
const openQuote = { ...inv, type: "quote", number: "QT/2026-27/010", status: "sent", paid: 0, date: iso(-1), dueDate: iso(14), shareToken: "e2eOpenQuoteTokenSharma0001", items: [{ id: "q1", description: "Mobile app (Android + iOS)", sac: "998314", qty: 1, rate: 80000, gst: 18 }, { id: "q2", description: "Admin panel", sac: "998314", qty: 1, rate: 20000, gst: 18 }], updatedAt: new Date(now.getTime() - 3600e3).toISOString() };
delete openQuote._id;
const { insertedId: openQuoteId } = await db.collection("billing").insertOne(openQuote);
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
  amcs: [{ id: "amc1", title: "Website AMC (Basic)", covers: "Website kept online and working\nSecurity and plugin updates\nUp to 5 small content changes a month\nMonthly backup", startDate: ist(-359), endDate: ist(6), amount: 12000, responseTime: "Within 1 working day", remind: true, sent: [], renewals: [] }],
  billingIds: billIds ? Object.values(billIds).map(String) : [], notes: "Prefers WhatsApp", lastLoginAt: "", invitedAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString(),
};
const { insertedId: cid } = await db.collection("portal_clients").insertOne(client);
const { _id: _skip, ...clientBase } = client;
const { insertedId: otherId } = await db.collection("portal_clients").insertOne({ ...clientBase, name: "Other Client", company: "Other Co", email: "other@client.test", projects: [], billingIds: [], amcs: [] });
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

  // ---- Quotation accept online ----
  const qc = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.25 });
  const qp = await qc.newPage();
  await qp.goto(`${base}/d/e2eOpenQuoteTokenSharma0001`, { waitUntil: "networkidle" });
  await qp.waitForTimeout(800);
  await qp.screenshot({ path: `${out}/11-quote-open.png`, fullPage: true });
  let q = await db.collection("billing").findOne({ _id: openQuoteId });
  ok("quote view is recorded", !!q.viewedAt && q.viewCount === 1);
  await qp.click('button:has-text("Request changes")');
  await qp.fill('input[autocomplete="name"]', "Rahul Sharma");
  await qp.fill("textarea", "Please add Hindi language support.");
  await qp.click('button:has-text("Send to us")');
  await qp.waitForSelector("text=Changes you asked for");
  q = await db.collection("billing").findOne({ _id: openQuoteId });
  ok("change request is saved", (q.changes || []).length === 1);
  await qp.click('button:has-text("Accept quotation")');
  await qp.fill('input[autocomplete="name"]', "Rahul Sharma");
  await qp.fill("textarea", "Advance tomorrow");
  await qp.check('input[type="checkbox"]');
  await qp.screenshot({ path: `${out}/12-quote-accept-form.png`, fullPage: true });
  await qp.click('button:has-text("Confirm and accept")');
  await qp.waitForSelector("text=Quotation accepted. Thank you!");
  await qp.screenshot({ path: `${out}/13-quote-accepted.png`, fullPage: true });
  q = await db.collection("billing").findOne({ _id: openQuoteId });
  ok("quote is accepted with a record", q.status === "accepted" && q.acceptance?.name === "Rahul Sharma" && q.acceptance?.total > 0, `total ${q.acceptance?.total}`);
  r = await qp.request.post(`${base}/api/d/e2eOpenQuoteTokenSharma0001`, { data: { action: "accept", name: "X", agree: true, version: q.updatedAt } });
  ok("second accept is refused", r.status() === 409, `status ${r.status()}`);
  r = await ap.request.patch(`${base}/api/admin/billing/${openQuoteId}`, { data: { items: [{ id: "z", description: "Cheaper", sac: "", qty: 1, rate: 1, gst: 0 }] } });
  q = await db.collection("billing").findOne({ _id: openQuoteId });
  ok("accepted quote is locked", q.items.length === 2 && q.items[0].rate === 80000, `status ${r.status()}`);
  // Stale page: a quote edited after the client opened it can't be accepted with the old version.
  const { insertedId: q2 } = await db.collection("billing").insertOne({ ...Object.fromEntries(Object.entries(openQuote).filter(([k]) => k !== "_id")), number: "QT/2026-27/011", shareToken: "e2eStaleQuoteTokenSharma001", acceptance: null, changes: [], updatedAt: new Date().toISOString() });
  r = await qp.request.post(`${base}/api/d/e2eStaleQuoteTokenSharma001`, { data: { action: "accept", name: "X", agree: true, version: "2020-01-01T00:00:00.000Z" } });
  ok("old version can't be accepted", r.status() === 409, `status ${r.status()}`);
  r = await qp.request.post(`${base}/api/d/e2eStaleQuoteTokenSharma001`, { data: { action: "accept", name: "X", agree: true, version: (await db.collection("billing").findOne({ _id: q2 })).updatedAt }, headers: { "content-type": "text/plain" } });
  ok("form posts from other sites are refused", r.status() === 400, `status ${r.status()}`);
  await ap.goto(`${base}/admin/billing/${openQuoteId}`); await ap.waitForSelector("text=Accepted online by", { timeout: 15000 }); await ap.waitForTimeout(600);
  await ap.screenshot({ path: `${out}/14-admin-quote-accepted.png`, fullPage: false });

  // ---- Online payment (Razorpay webhook, signed like Razorpay does) ----
  const invId = Object.values(billIds)[0];
  await qp.goto(`${base}/d/e2eShareTokenSharmaTraders01`, { waitUntil: "networkidle" }); await qp.waitForTimeout(600);
  ok("invoice link shows Pay now", (await qp.content()).includes("now</button>") || (await qp.locator("button", { hasText: "now" }).count()) > 0);
  await qp.screenshot({ path: `${out}/15-invoice-pay.png`, fullPage: true });
  const hook = async (body, sig) => qp.request.post(`${base}/api/razorpay/webhook`, { data: body, headers: { "content-type": "application/json", "x-razorpay-signature": sig ?? createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex") } });
  const event = (pid, oid, amount) => JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: pid, order_id: oid, amount, currency: "INR", status: "captured", method: "upi" } } } });
  await db.collection("online_orders").insertMany([{ _id: "order_E2Etest0001", billId: String(invId), amount: 500000, createdAt: new Date() }, { _id: "order_E2Etest0002", billId: String(invId), amount: 730000, createdAt: new Date() }]);
  const paidNow = async () => (await db.collection("billing").findOne({ _id: invId })).paid;
  const before = await paidNow();
  r = await hook(event("pay_E2Etest0001", "order_E2Etest0001", 500000));
  ok("webhook payment is recorded", r.status() === 200 && (await paidNow()) === before + 5000, `paid ${await paidNow()}`);
  r = await hook(event("pay_E2Etest0001", "order_E2Etest0001", 500000));
  ok("same payment twice is counted once", (await paidNow()) === before + 5000);
  r = await hook(event("pay_E2Ebad00001", "order_E2Etest0001", 500000), "0".repeat(64));
  ok("unsigned webhook is refused", r.status() === 400 && (await paidNow()) === before + 5000, `status ${r.status()}`);
  r = await hook(event("pay_E2Eunknown1", "order_NotOurs00001", 999900));
  ok("payment for an unknown order is ignored", r.status() === 200 && (await paidNow()) === before + 5000);
  r = await hook(event("pay_E2Etest0002", "order_E2Etest0002", 730000));
  const invDoc = await db.collection("billing").findOne({ _id: invId });
  ok("full payment marks the invoice paid", invDoc.status === "paid" && invDoc.paid === 30000, `${invDoc.status} ${invDoc.paid}`);
  r = await qp.request.post(`${base}/api/pay/e2eShareTokenSharmaTraders01/verify`, { data: { orderId: "order_E2Etest0001", paymentId: "pay_E2Etest0009", signature: "bad" } });
  ok("checkout with a fake signature is refused", r.status() === 400, `status ${r.status()}`);
  r = await ap.request.patch(`${base}/api/admin/billing/${invId}`, { data: { version: "2020-01-01T00:00:00.000Z", paid: 0 } });
  ok("stale admin save can't overwrite a payment", r.status() === 409 && (await paidNow()) === 30000, `status ${r.status()}`);
  await qp.reload({ waitUntil: "networkidle" }); await qp.waitForTimeout(500);
  ok("paid invoice hides Pay now", (await qp.locator("button", { hasText: "now" }).count()) === 0);
  await ap.goto(`${base}/admin/billing/${invId}`); await ap.waitForSelector("text=Paid online", { timeout: 15000 }); await ap.waitForTimeout(500);
  await ap.screenshot({ path: `${out}/16-admin-paid-online.png`, fullPage: true });

  // ---- AMC: complaints and renewal reminders ----
  await db.collection("portal_logins").insertOne({ kind: "code", clientId: String(cid), hash: hash("112233"), attempts: 0, expiresAt: new Date(Date.now() + 6e5) });
  const dc = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.25 });
  const dp = await dc.newPage();
  r = await dp.request.post(`${base}/api/portal/login/verify`, { data: { email: "rahul@sharmatraders.test", code: "112233" } });
  await dp.goto(`${base}/portal`, { waitUntil: "networkidle" }); await dp.waitForTimeout(500);
  let html = await dp.content();
  ok("portal shows the AMC with days left", html.includes("Maintenance plan") && html.includes("Ends in 6 days"));
  await dp.screenshot({ path: `${out}/17-portal-amc.png`, fullPage: true });
  r = await dp.request.post(`${base}/api/portal/tickets`, { data: { subject: "Website is not opening", message: "Since morning the website shows an error. Customers can't order.", kind: "problem", urgent: true } });
  const urgentId = r.status() === 201 ? (await r.json()).id : "";
  let tk = urgentId && (await db.collection("portal_tickets").findOne({ _id: new ObjectId(urgentId) }));
  ok("urgent complaint is saved as covered by AMC", !!tk && tk.urgent === true && tk.kind === "problem" && tk.amcCovered === true && tk.amcId === "amc1", `status ${r.status()}`);
  r = await dp.request.post(`${base}/api/portal/tickets`, { data: { subject: "Odd", message: "x", kind: "hack", urgent: true } });
  tk = await db.collection("portal_tickets").findOne({ _id: new ObjectId((await r.json()).id) });
  ok("unknown type and urgent on non-problems are ignored", tk.kind === "question" && tk.urgent === false);
  await dp.goto(`${base}/portal/support?renew=amc1`, { waitUntil: "networkidle" }); await dp.waitForTimeout(400);
  ok("renew link fills the renewal request", (await dp.inputValue('input[maxlength="140"]')).includes("renew my Website AMC"));
  await dp.screenshot({ path: `${out}/18-portal-renew.png`, fullPage: true });
  r = await ap.request.get(`${base}/api/admin/clients/tickets`);
  const openList = await r.json();
  ok("admin open requests list puts urgent first", Array.isArray(openList) && openList[0]?.id === urgentId, `first ${openList[0]?.subject}`);
  // The browser can't fake "already sent" reminders.
  const cur = await (await ap.request.get(`${base}/api/admin/clients/${cid}`)).json();
  r = await ap.request.patch(`${base}/api/admin/clients/${cid}`, { data: { amcs: cur.client.amcs.map((a) => ({ ...a, sent: [`${a.endDate}:30`, `${a.endDate}:7`, `${a.endDate}:1`, `${a.endDate}:0`, `${a.endDate}:-1`] })) } });
  ok("reminder history can't be set from the browser", r.status() === 200 && (await r.json()).amcs[0].sent.length === 0);
  // Scheduler: reminders due today, only once.
  await ap.request.put(`${base}/api/admin/automation`, { data: { reminderHour: 0, amcRemindersOn: true, amcEmailClient: false, amcRemindDays: "30, 7, 1, 0" } });
  const cronUrl = new URL((await (await ap.request.get(`${base}/api/admin/automation`)).json()).cronUrl);
  r = await dp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  let cj = await r.json();
  ok("scheduler finds the AMC renewal due", r.status() === 200 && cj.done?.amc?.due === 1, JSON.stringify(cj.done?.amc ?? cj).slice(0, 120));
  let amcNow = (await db.collection("portal_clients").findOne({ _id: cid })).amcs[0];
  ok("reminder is marked as sent", amcNow.sent.includes(`${amcNow.endDate}:7`) && amcNow.sent.includes(`${amcNow.endDate}:30`), amcNow.sent.join(","));
  r = await ap.request.post(`${base}/api/admin/automation/run`, { data: { job: "amc" } });
  ok("same reminder is not sent twice", /nothing was sent/.test((await r.json()).message || ""));
  // Renewal invoice and renewal.
  r = await ap.request.post(`${base}/api/admin/clients/${cid}/amc`, { data: { action: "invoice", amcId: "amc1" } });
  const renInv = r.status() === 201 ? (await r.json()).id : "";
  const renDoc = renInv && (await db.collection("billing").findOne({ _id: new ObjectId(renInv) }));
  const linked = (await db.collection("portal_clients").findOne({ _id: cid })).billingIds.includes(renInv);
  ok("renewal invoice is made and shown in the portal", !!renDoc && renDoc.items[0].rate === 12000 && /renewal/.test(renDoc.items[0].description) && linked, `status ${r.status()}`);
  r = await ap.request.post(`${base}/api/admin/clients/${cid}/amc`, { data: { action: "invoice", amcId: "amc1" } });
  ok("second renewal invoice is refused", r.status() === 409, `status ${r.status()}`);
  const oldEnd = amcNow.endDate;
  r = await ap.request.post(`${base}/api/admin/clients/${cid}/amc`, { data: { action: "renew", amcId: "amc1", endDate: oldEnd } });
  amcNow = (await db.collection("portal_clients").findOne({ _id: cid })).amcs[0];
  ok("renew moves the plan one year ahead", r.status() === 200 && amcNow.startDate === ist(7) && amcNow.endDate > oldEnd && amcNow.sent.length === 0 && amcNow.renewals.length === 1, `${amcNow.startDate} to ${amcNow.endDate}`);
  r = await dp.request.post(`${base}/api/portal/tickets`, { data: { subject: "Early renewed check", message: "Still covered?", kind: "question" } });
  tk = await db.collection("portal_tickets").findOne({ _id: new ObjectId((await r.json()).id) });
  ok("early renewal keeps the client covered until the new year starts", tk.amcCovered === true);
  r = await ap.request.post(`${base}/api/admin/clients/${cid}/amc`, { data: { action: "renew", amcId: "amc1", endDate: oldEnd } });
  ok("double renew is refused", r.status() === 409, `status ${r.status()}`);
  await ap.goto(`${base}/admin/clients/${cid}?tab=amc`); await ap.waitForSelector("text=Renew for 1 year", { timeout: 15000 }); await ap.waitForTimeout(500);
  await ap.screenshot({ path: `${out}/19-admin-amc.png`, fullPage: true });
  await ap.goto(`${base}/admin/clients/${cid}?tab=support`); await ap.waitForSelector("text=Website is not opening", { timeout: 15000 });
  await ap.click("text=Website is not opening"); await ap.waitForTimeout(700);
  await ap.screenshot({ path: `${out}/20-admin-urgent-ticket.png`, fullPage: false });
  // An expired plan: requests are marked not covered.
  await db.collection("portal_clients").updateOne({ _id: cid }, { $set: { "amcs.0.endDate": ist(-3), "amcs.0.startDate": ist(-368), "amcs.0.renewals": [] } });
  r = await dp.request.post(`${base}/api/portal/tickets`, { data: { subject: "Add a banner", message: "Please add a Diwali banner.", kind: "change" } });
  tk = await db.collection("portal_tickets").findOne({ _id: new ObjectId((await r.json()).id) });
  ok("request after the AMC ended is marked not covered", tk.amcCovered === false && tk.amcTitle === "Website AMC (Basic)");
  await dp.goto(`${base}/portal`, { waitUntil: "networkidle" }); await dp.waitForTimeout(400);
  ok("portal asks to renew an expired plan", (await dp.content()).includes("Renew plan"));

  // ---- Payslips ----
  const E = (o) => ap.request.post(`${base}/api/admin/payroll/employees`, { data: o });
  r = await E({ name: "Aman Verma", email: "aman@spinex.test", designation: "Web Developer", department: "Development", joiningDate: "2025-06-02", location: "Jaipur", pan: "ABCPV1234K", uan: "101234567890", bankName: "HDFC Bank", bankLast4: "50100012344821", pf: true, esi: false, earnings: [{ label: "Basic", amount: 15000 }, { label: "House rent allowance (HRA)", amount: 6000 }, { label: "Special allowance", amount: 9000 }] });
  const aman = await r.json();
  ok("employee is added with an auto ID and only the last 4 bank digits", r.status() === 201 && /^SPX-E-\d{3}$/.test(aman.empCode) && aman.bankLast4 === "4821", `${aman.empCode} ${aman.bankLast4}`);
  await E({ name: "Pooja Saini", email: "pooja@spinex.test", designation: "Graphic Designer", department: "Design", joiningDate: "2026-01-12", location: "Jaipur", pan: "DEFPS5678L", bankName: "SBI", bankLast4: "7710", pf: true, esi: true, earnings: [{ label: "Basic", amount: 9000 }, { label: "House rent allowance (HRA)", amount: 3600 }, { label: "Special allowance", amount: 5400 }] });
  await E({ name: "Late Joiner", email: "late@spinex.test", joiningDate: "2026-12-01", earnings: [{ label: "Basic", amount: 10000 }] });
  r = await ap.request.post(`${base}/api/admin/payroll/payslips`, { data: { month: "2026-09" } });
  let mk = await r.json();
  ok("payslips are made for everyone working that month", r.status() === 201 && mk.made === 2, JSON.stringify(mk));
  r = await ap.request.post(`${base}/api/admin/payroll/payslips`, { data: { month: "2026-09" } });
  mk = await r.json();
  ok("making them again doesn't duplicate", mk.made === 0 && mk.skipped === 2);
  let list = (await (await ap.request.get(`${base}/api/admin/payroll/payslips?month=2026-09`)).json()).payslips;
  const ps = (name) => list.find((x) => x.emp.name === name);
  const net = (x) => x.earnings.reduce((a, b) => a + b.amount, 0) - x.deductions.reduce((a, b) => a + b.amount, 0);
  const pooja = ps("Pooja Saini");
  ok("PF and ESI are worked out", pooja.deductions.find((d) => d.auto === "pf")?.amount === 1080 && pooja.deductions.find((d) => d.auto === "esi")?.amount === 135 && net(pooja) === 16785, `net ${net(pooja)}`);
  let am = ps("Aman Verma");
  r = await ap.request.patch(`${base}/api/admin/payroll/payslips/${am.id}`, { data: { version: am.updatedAt, paidDays: 27, earnings: [...am.earnings, { id: "bonus", label: "Performance bonus", full: 2000, amount: 2000, prorate: false }], paymentDate: "2026-10-01", paymentMode: "Bank transfer" } });
  am = await r.json();
  ok("leave without pay and a bonus are worked out", r.status() === 200 && am.earnings[0].amount === 13500 && am.deductions[0].amount === 1620 && net(am) === 27380, `net ${net(am)}`);
  r = await ap.request.patch(`${base}/api/admin/payroll/payslips/${am.id}`, { data: { version: "2020-01-01T00:00:00.000Z", paidDays: 30 } });
  ok("stale payslip save is refused", r.status() === 409, `status ${r.status()}`);
  r = await ap.request.get(`${base}/p/${am.token}`);
  ok("draft payslip link doesn't open", r.status() === 404, `status ${r.status()}`);
  r = await ap.request.post(`${base}/api/admin/payroll/payslips/bulk`, { data: { month: "2026-09", action: "issue" } });
  ok("issue all drafts", (await r.json()).issued === 2);
  list = (await (await ap.request.get(`${base}/api/admin/payroll/payslips?month=2026-09`)).json()).payslips;
  am = ps("Aman Verma");
  ok("issued payslip has number and code", /^SPX\/PS\/2026-09\/00\d$/.test(am.number) && /^SPX-P-[A-Z0-9]{6}$/.test(am.verifyCode), `${am.number} ${am.verifyCode}`);
  let v = await (await dp.request.get(`${base}/api/verify?id=${am.verifyCode}`)).json();
  ok("verify shows the payslip", v.valid && v.kind === "payslip" && v.name === "Aman Verma" && v.net === 27380 && v.month === "September 2026", JSON.stringify(v).slice(0, 160));
  r = await ap.request.patch(`${base}/api/admin/payroll/payslips/${am.id}`, { data: { version: am.updatedAt, paidDays: 30 } });
  ok("issued payslip can't be changed", r.status() === 409);
  r = await ap.request.delete(`${base}/api/admin/payroll/payslips/${am.id}`);
  ok("issued payslip can't be deleted", r.status() === 409);
  r = await ap.request.delete(`${base}/api/admin/payroll/employees/${aman.id}`);
  ok("employee with issued payslips can't be deleted", r.status() === 409);
  // Employee's link and the PDF: one A4 page.
  const pc = await browser.newContext({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 1.25 });
  const pg2 = await pc.newPage();
  await pg2.goto(`${base}/p/${am.token}`, { waitUntil: "networkidle" }); await pg2.waitForTimeout(800);
  ok("employee link shows the payslip", (await pg2.content()).includes("Net pay") && (await pg2.content()).includes(am.verifyCode));
  await pg2.screenshot({ path: `${out}/21-payslip.png`, fullPage: true });
  await pg2.emulateMedia({ media: "print" });
  const pdf = await pg2.pdf({ format: "A4", preferCSSPageSize: true, printBackground: true });
  writeFileSync(`${out}/payslip-sample.pdf`, pdf);
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  ok("payslip PDF is one page", pages === 1, `${pages} pages`);
  // Revoke, then correct and issue again with a new code.
  r = await ap.request.post(`${base}/api/admin/payroll/payslips/${am.id}`, { data: { action: "revoke" } });
  v = await (await dp.request.get(`${base}/api/verify?id=${am.verifyCode}`)).json();
  ok("revoked payslip shows as withdrawn", !v.valid && /withdrawn/.test(v.error || ""));
  const oldCode = am.verifyCode;
  am = await (await ap.request.post(`${base}/api/admin/payroll/payslips/${am.id}`, { data: { action: "draft" } })).json();
  am = await (await ap.request.patch(`${base}/api/admin/payroll/payslips/${am.id}`, { data: { version: am.updatedAt, paidDays: 28 } })).json();
  am = await (await ap.request.post(`${base}/api/admin/payroll/payslips/${am.id}`, { data: { action: "issue" } })).json();
  v = await (await dp.request.get(`${base}/api/verify?id=${oldCode}`)).json();
  const v2 = await (await dp.request.get(`${base}/api/verify?id=${am.verifyCode}`)).json();
  ok("corrected payslip gets a new code, old one stops working", !v.valid && v2.valid && am.verifyCode !== oldCode && am.number.endsWith(String(am.number).slice(-3)), `${oldCode} → ${am.verifyCode}`);
  await ap.goto(`${base}/admin/payslips/${ps("Pooja Saini").id}`); await ap.waitForSelector("text=Earnings", { timeout: 15000 }); await ap.waitForTimeout(700);
  await ap.screenshot({ path: `${out}/22-admin-payslip-editor.png`, fullPage: true });
  await ap.goto(`${base}/admin#payslips`); await ap.waitForSelector("text=Monthly payslips", { timeout: 15000 });
  await ap.fill('input[type="month"]', "2026-09"); await ap.waitForTimeout(1500);
  ok("late joiner isn't counted as missing", (await ap.locator("button", { hasText: "Make payslips for" }).isDisabled()));
  await ap.screenshot({ path: `${out}/23-admin-payslips-month.png`, fullPage: false });

  // ---- Attendance and leave ----
  const emps = await (await ap.request.get(`${base}/api/admin/payroll/employees`)).json();
  const poojaE = emps.find((x) => x.name === "Pooja Saini");
  await ap.request.put(`${base}/api/admin/attendance/settings`, { data: { mode: "present", weeklyOff: [0], holidays: [{ date: "2026-08-15", label: "Independence Day" }, { date: ist(40), label: "Test holiday" }], leaveTypes: [{ id: "casual", label: "Casual leave", paid: true, perYear: 12 }, { id: "sick", label: "Sick leave", paid: true, perYear: 6 }, { id: "unpaid", label: "Unpaid leave", paid: false, perYear: 0 }] } });
  r = await ap.request.post(`${base}/api/admin/leaves`, { data: { employeeId: poojaE.id, type: "unpaid", from: "2026-08-10", to: "2026-08-11", reason: "Family function" } });
  ok("team can add leave for someone", r.status() === 201 && (await r.json()).days === 2, `status ${r.status()}`);
  await ap.request.post(`${base}/api/admin/leaves`, { data: { employeeId: poojaE.id, type: "casual", from: "2026-08-14", to: "2026-08-16", reason: "Trip" } });
  await ap.request.post(`${base}/api/admin/attendance/mark`, { data: { employeeId: poojaE.id, date: "2026-08-20", mark: "absent" } });
  await ap.request.post(`${base}/api/admin/attendance/mark`, { data: { employeeId: poojaE.id, date: "2026-08-21", mark: "half" } });
  const grid = await (await ap.request.get(`${base}/api/admin/attendance?month=2026-08`)).json();
  const pg = grid.employees.find((x) => x.id === poojaE.id)?.summary;
  ok("leave over a holiday and Sunday counts only working days", pg?.days["2026-08-15"] === "holiday" && pg?.days["2026-08-16"] === "off" && pg?.paidLeave === 1, JSON.stringify({ pl: pg?.paidLeave, d15: pg?.days["2026-08-15"] }));
  ok("pay cut days from absent, unpaid leave and half day", pg?.lop === 3.5 && pg?.absent === 1 && pg?.unpaidLeave === 2, `lop ${pg?.lop}`);
  r = await ap.request.post(`${base}/api/admin/payroll/payslips`, { data: { month: "2026-08" } });
  const augList = (await (await ap.request.get(`${base}/api/admin/payroll/payslips?month=2026-08`)).json()).payslips;
  const pAug = augList.find((x) => x.emp.name === "Pooja Saini");
  const aAug = augList.find((x) => x.emp.name === "Aman Verma");
  ok("payslip paid days come from attendance", pAug?.paidDays === 27.5 && pAug?.attendance?.lop === 3.5 && aAug?.paidDays === 31, `${pAug?.paidDays} / ${aAug?.paidDays}`);
  ok("salary is cut for those days", pAug?.earnings[0].amount === Math.round(9000 * 27.5 / 31), `basic ${pAug?.earnings[0].amount}`);
  // Staff portal login and leave.
  await db.collection("portal_logins").insertOne({ kind: "staff-code", clientId: `staff:${poojaE.id}`, hash: hash("445566"), attempts: 0, expiresAt: new Date(Date.now() + 6e5) });
  const sc = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.25 });
  const sp = await sc.newPage();
  r = await sp.request.post(`${base}/api/staff/login/verify`, { data: { email: "pooja@spinex.test", code: "000000" } });
  ok("staff wrong code is refused", r.status() === 400);
  r = await sp.request.post(`${base}/api/staff/login/verify`, { data: { email: "pooja@spinex.test", code: "445566" } });
  ok("employee logs in to the staff portal", r.status() === 200, `status ${r.status()}`);
  r = await sp.request.get(`${base}/api/admin/payroll/employees`);
  ok("staff cookie can't open admin API", r.status() === 401, `status ${r.status()}`);
  r = await sp.request.post(`${base}/api/staff/checkin`, { data: { action: "in" } });
  const firstIn = (await r.json()).day?.checkIn;
  await new Promise((res) => setTimeout(res, 1100));
  r = await sp.request.post(`${base}/api/staff/checkin`, { data: { action: "in" } });
  ok("check-in keeps the first time", !!firstIn && (await r.json()).day?.checkIn === firstIn);
  await sp.request.post(`${base}/api/staff/checkin`, { data: { action: "out" } });
  // A future working day (not Sunday, not the test holiday).
  let d1 = ist(9); while (new Date(`${d1}T00:00:00Z`).getUTCDay() === 0) d1 = new Date(Date.parse(`${d1}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);
  r = await sp.request.post(`${base}/api/staff/leave`, { data: { type: "casual", from: d1, to: d1, half: false, reason: "Doctor visit" } });
  const lv1 = (await r.json()).id;
  ok("employee applies for leave", r.status() === 201, `status ${r.status()}`);
  r = await sp.request.post(`${base}/api/staff/leave`, { data: { type: "sick", from: d1, to: d1, reason: "Same day" } });
  ok("overlapping leave is refused", r.status() === 409, `status ${r.status()}`);
  let sun = ist(14); while (new Date(`${sun}T00:00:00Z`).getUTCDay() !== 0) sun = new Date(Date.parse(`${sun}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);
  r = await sp.request.post(`${base}/api/staff/leave`, { data: { type: "casual", from: sun, to: sun, reason: "Sunday" } });
  ok("leave on a weekly off is refused", r.status() === 400, `status ${r.status()}`);
  r = await sp.request.post(`${base}/api/staff/leave`, { data: { type: "casual", from: "2026-01-05", to: "2026-01-06", reason: "Old" } });
  ok("old backdated leave is refused", r.status() === 400);
  let d2 = new Date(Date.parse(`${d1}T00:00:00Z`) + 2 * 864e5).toISOString().slice(0, 10);
  while (new Date(`${d2}T00:00:00Z`).getUTCDay() === 0) d2 = new Date(Date.parse(`${d2}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);
  r = await sp.request.post(`${base}/api/staff/leave`, { data: { type: "sick", from: d2, to: d2, half: true, reason: "Half day for bank work" } });
  const lv2 = (await r.json()).id;
  const lvList = await (await ap.request.get(`${base}/api/admin/leaves?status=pending`)).json();
  ok("admin sees waiting requests first", lvList.pending >= 2 && lvList.leaves[0].status === "pending");
  r = await ap.request.post(`${base}/api/admin/leaves/${lv1}`, { data: { action: "approve", note: "Get well soon" } });
  ok("admin approves leave", r.status() === 200 && (await r.json()).status === "approved");
  r = await ap.request.post(`${base}/api/admin/leaves/${lv1}`, { data: { action: "approve" } });
  ok("approving twice is refused", r.status() === 400);
  r = await ap.request.post(`${base}/api/admin/leaves/${lv2}`, { data: { action: "reject", note: "Busy week" } });
  ok("admin can say no", (await r.json()).status === "rejected");
  r = await sp.request.post(`${base}/api/staff/leave/${lv2}`, { data: {} });
  ok("employee can't cancel a rejected request", r.status() === 400);
  r = await sp.request.post(`${base}/api/staff/leave/000000000000000000000000`, { data: {} });
  ok("employee can't touch other leave", r.status() === 404);
  await sp.goto(`${base}/staff`, { waitUntil: "networkidle" }); await sp.waitForTimeout(600);
  const shtml = await sp.content();
  ok("staff portal shows balance, leave and payslips", shtml.includes("Pooja Saini") && shtml.includes("Leave balance") && shtml.includes("September 2026") && shtml.includes("Approved"));
  await sp.screenshot({ path: `${out}/24-staff-portal.png`, fullPage: true });
  const sph = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: await sc.storageState() });
  const spp = await sph.newPage();
  await spp.goto(`${base}/staff`, { waitUntil: "networkidle" }); await spp.waitForTimeout(500);
  await spp.screenshot({ path: `${out}/25-staff-phone.png`, fullPage: false });
  await ap.goto("about:blank"); await ap.goto(`${base}/admin#attendance`); await ap.waitForSelector("text=Leave requests", { timeout: 15000 }); await ap.waitForTimeout(1200);
  await ap.screenshot({ path: `${out}/26-admin-leave.png`, fullPage: false });
  await ap.click("text=Monthly attendance"); await ap.waitForTimeout(500);
  await ap.fill('input[type="month"]', "2026-08"); await ap.waitForTimeout(1500);
  await ap.screenshot({ path: `${out}/27-admin-attendance.png`, fullPage: false });
  await ap.goto(`${base}/admin/payslips/${pAug.id}`); await ap.waitForSelector("text=From attendance", { timeout: 15000 }); await ap.waitForTimeout(600);
  await ap.screenshot({ path: `${out}/28-payslip-from-attendance.png`, fullPage: false });
  // Marking someone as left ends their staff session.
  await ap.request.patch(`${base}/api/admin/payroll/employees/${poojaE.id}`, { data: { active: false } });
  await sp.goto(`${base}/staff`); await sp.waitForTimeout(300);
  ok("employee marked as left is logged out", sp.url().includes("/staff/login"));

  // ---- Leads from ads ----
  // A stand-in for Meta's Graph API (the app is pointed at it with META_GRAPH_URL).
  let tokenBroken = true;
  const graphHits = [];
  const graphSrv = createServer((rq, rs) => {
    const u = new URL(rq.url, "http://x");
    graphHits.push(u.pathname + "?" + u.searchParams.get("access_token"));
    rs.setHeader("content-type", "application/json");
    if (u.searchParams.get("access_token") !== "e2e-meta-page-token") { rs.statusCode = 400; return rs.end(JSON.stringify({ error: { message: "Invalid OAuth access token" } })); }
    if (u.pathname.endsWith("/555")) return rs.end(JSON.stringify({ name: "Website enquiry form" }));
    if (u.pathname.endsWith("/700000002") && tokenBroken) { rs.statusCode = 400; return rs.end(JSON.stringify({ error: { message: "Error validating access token: Session has expired" } })); }
    if (/\/7000000\d\d$/.test(u.pathname)) return rs.end(JSON.stringify({ id: u.pathname.split("/").pop(), form_id: "555", campaign_name: "Diwali Website Offer", ad_name: "Reel - Rs 9999 website", platform: "ig", field_data: [{ name: "full_name", values: ["Rakesh Meena"] }, { name: "phone_number", values: ["+919828012345"] }, { name: "email", values: ["rakesh@meenahandicrafts.test"] }, { name: "which_service_do_you_need?", values: ["E-commerce website"] }, { name: "city", values: ["Jaipur"] }] }));
    rs.statusCode = 404; rs.end("{}");
  }).listen(3299);
  const metaPost = (body, sig) => qp.request.post(`${base}/api/ads/meta`, { data: body, headers: { "content-type": "application/json", "x-hub-signature-256": sig ?? `sha256=${createHmac("sha256", process.env.META_APP_SECRET).update(body).digest("hex")}` } });
  const metaEvent = (id) => JSON.stringify({ object: "page", entry: [{ id: "123", time: 1, changes: [{ field: "leadgen", value: { leadgen_id: id, page_id: "123", form_id: "555", ad_id: "9" } }] }] });
  r = await qp.request.get(`${base}/api/ads/meta?hub.mode=subscribe&hub.verify_token=${process.env.META_VERIFY_TOKEN}&hub.challenge=abc123`);
  ok("Meta webhook verification answers the challenge", r.status() === 200 && (await r.text()) === "abc123");
  r = await qp.request.get(`${base}/api/ads/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123`);
  ok("wrong verify token is refused", r.status() === 403);
  r = await metaPost(metaEvent("700000001"), "sha256=" + "0".repeat(64));
  ok("unsigned Meta webhook is refused", r.status() === 401, `status ${r.status()}`);
  r = await metaPost(metaEvent("700000001"));
  let ml = await db.collection("leads").findOne({ adLeadId: "meta:700000001" });
  ok("Meta lead lands in Leads", r.status() === 200 && ml?.name === "Rakesh Meena" && ml?.phone === "+919828012345" && ml?.email === "rakesh@meenahandicrafts.test" && ml?.services === "E-commerce website" && ml?.source === "meta", JSON.stringify({ s: r.status(), n: ml?.name, p: ml?.phone }));
  ok("Meta lead keeps campaign, ad and extra answers", ml?.track?.channel === "Meta Ads (Facebook / Instagram)" && ml?.track?.utmCampaign === "Diwali Website Offer" && ml?.track?.utmContent === "Reel - Rs 9999 website" && /City: Jaipur/.test(ml?.message || "") && ml?.adForm === "Website enquiry form", `${ml?.track?.channel} | ${ml?.message}`);
  await metaPost(metaEvent("700000001"));
  ok("same Meta lead twice is saved once", (await db.collection("leads").countDocuments({ adLeadId: "meta:700000001" })) === 1);
  r = await metaPost(metaEvent("700000002"));
  ml = await db.collection("leads").findOne({ adLeadId: "meta:700000002" });
  ok("lead is kept even when the token fails (and Meta is asked to send it again)", r.status() === 500 && ml?.adIncomplete === true && /700000002/.test(ml?.message || ""));
  tokenBroken = false;
  await metaPost(metaEvent("700000002"));
  ml = await db.collection("leads").findOne({ adLeadId: "meta:700000002" });
  ok("Meta's retry fills in the details", ml?.adIncomplete === false && ml?.name === "Rakesh Meena" && (await db.collection("leads").countDocuments({ adLeadId: "meta:700000002" })) === 1);
  // Google Ads lead form webhook.
  const gLead = (o = {}) => ({ lead_id: "TeSter-123-ABCDEFGHIJKLMNOPQRSTUVWXYZ", api_version: "1.0", form_id: 40000000, campaign_id: 12345678901, adgroup_id: 9876, gcl_id: "EAIaIQobChMI-test", google_key: process.env.GOOGLE_LEADS_KEY, is_test: false, user_column_data: [{ column_name: "Full Name", string_value: "Neha Agarwal", column_id: "FULL_NAME" }, { column_name: "User Phone", string_value: "+91 94140 55555", column_id: "PHONE_NUMBER" }, { column_name: "User Email", string_value: "Neha@AgarwalJewels.test", column_id: "EMAIL" }, { column_name: "What is your budget?", string_value: "50,000 - 1 lakh", column_id: "BUDGET" }, { column_name: "Business type", string_value: "Jewellery shop", column_id: "QUESTION_1" }], ...o });
  r = await qp.request.post(`${base}/api/ads/google`, { data: gLead({ google_key: "wrong" }) });
  ok("Google webhook with the wrong key is refused", r.status() === 401);
  r = await qp.request.post(`${base}/api/ads/google`, { data: gLead() });
  const gl = await db.collection("leads").findOne({ adLeadId: "google:TeSter-123-ABCDEFGHIJKLMNOPQRSTUVWXYZ" });
  ok("Google Ads lead lands in Leads", r.status() === 200 && gl?.name === "Neha Agarwal" && gl?.phone === "+919414055555" && gl?.email === "neha@agarwaljewels.test" && gl?.budget === "50,000 - 1 lakh" && gl?.track?.channel === "Google Ads" && /Business type: Jewellery shop/.test(gl?.message || ""), JSON.stringify({ n: gl?.name, ch: gl?.track?.channel, m: gl?.message }));
  await qp.request.post(`${base}/api/ads/google`, { data: gLead() });
  ok("same Google lead twice is saved once", (await db.collection("leads").countDocuments({ adLeadId: { $regex: "^google:TeSter" } })) === 1);
  r = await qp.request.post(`${base}/api/ads/google`, { data: gLead({ lead_id: "test-lead-2", is_test: true }) });
  const tl = await db.collection("leads").findOne({ adLeadId: "google:test-lead-2" });
  ok("Google test data is marked as a test", /TEST LEAD/.test(tl?.message || ""));
  const st = await (await ap.request.get(`${base}/api/admin/ad-leads`)).json();
  ok("setup screen shows both working", !!st.state?.lastMeta && st.state?.lastMetaName === "Rakesh Meena" && !!st.state?.lastGoogle && st.meta.appSecret && st.google.key, st.state?.lastMetaName);
  graphSrv.closeAllConnections?.(); graphSrv.close();
  await ap.goto("about:blank"); await ap.goto(`${base}/admin#leads`); await ap.waitForSelector("text=Rakesh Meena", { timeout: 15000 }); await ap.waitForTimeout(800);
  await ap.screenshot({ path: `${out}/29-leads-from-ads.png`, fullPage: false });
  await ap.click("text=Get leads from ads"); await ap.waitForSelector("text=Callback URL for Meta", { timeout: 10000 }); await ap.waitForTimeout(600);
  await ap.screenshot({ path: `${out}/30-ads-setup.png`, fullPage: false });

  // ---- Free consultation call booking ----
  const gcal = { events: [], patches: [], deletes: [], busy: [] };
  const gSrv = createServer(async (rq, rs) => {
    const u = new URL(rq.url, "http://x");
    let body = "";
    for await (const c of rq) body += c;
    rs.setHeader("content-type", "application/json");
    if (u.pathname === "/o/oauth2/v2/auth") { rs.statusCode = 302; rs.setHeader("location", `${u.searchParams.get("redirect_uri")}?code=e2e-code&state=${u.searchParams.get("state")}`); return rs.end(); }
    if (u.pathname === "/token") { const f = new URLSearchParams(body); return rs.end(JSON.stringify(f.get("grant_type") === "authorization_code" ? { refresh_token: "e2e-refresh", access_token: "at1", expires_in: 3600 } : { access_token: "at2", expires_in: 3600 })); }
    if (u.pathname === "/calendar/v3/freeBusy") return rs.end(JSON.stringify({ calendars: { primary: { busy: gcal.busy } } }));
    if (u.pathname === "/calendar/v3/calendars/primary") return rs.end(JSON.stringify({ id: "owner@spinex.test" }));
    if (u.pathname === "/calendar/v3/calendars/primary/events" && rq.method === "POST") { gcal.events.push({ q: u.search, body: JSON.parse(body) }); return rs.end(JSON.stringify({ id: `evt${gcal.events.length}`, hangoutLink: `https://meet.google.com/e2e-test-${gcal.events.length}` })); }
    if (u.pathname.startsWith("/calendar/v3/calendars/primary/events/") && rq.method === "PATCH") { gcal.patches.push(JSON.parse(body)); return rs.end("{}"); }
    if (u.pathname.startsWith("/calendar/v3/calendars/primary/events/") && rq.method === "DELETE") { gcal.deletes.push(u.pathname); rs.statusCode = 204; return rs.end(); }
    rs.statusCode = 404; rs.end("{}");
  }).listen(3298);
  r = await qp.request.get(`${base}/api/booking/slots`);
  ok("booking is off until it is turned on", (await r.json()).enabled === false);
  r = await qp.request.post(`${base}/api/booking`, { data: { name: "X", phone: "9876543210", email: "x@y.test", date: ist(1), time: "10:00", startedAt: String(Date.now() - 9000) } });
  ok("booking API refuses while off", r.status() === 403, `status ${r.status()}`);
  const week = Array.from({ length: 7 }, () => ({ on: true, start: "09:00", end: "18:00" }));
  r = await ap.request.put(`${base}/api/admin/bookings/settings`, { data: { enabled: true, duration: 30, buffer: 0, minNoticeHours: 0, daysAhead: 7, maxPerDay: 0, week, blocked: [ist(3)], meetMode: "google", meetLink: "https://meet.google.com/backup-link", topics: ["Website", "Mobile app", "Digital marketing"], reminders: true } });
  ok("admin turns booking on", r.status() === 200 && (await r.json()).enabled === true);
  await ap.goto(`${base}/api/admin/google/connect`); await ap.waitForURL((u) => u.pathname === "/admin", { timeout: 15000 });
  let bk = await (await ap.request.get(`${base}/api/admin/bookings`)).json();
  ok("Google Calendar connects", bk.google.connected === true && bk.google.email === "owner@spinex.test", JSON.stringify(bk.google));
  const bd1 = ist(1);
  gcal.busy = [{ start: `${bd1}T11:00:00+05:30`, end: `${bd1}T11:30:00+05:30` }];
  let slots = (await (await qp.request.get(`${base}/api/booking/slots`)).json()).days;
  const day1 = slots.find((x) => x.date === bd1);
  ok("free times skip Google busy times and days off", !!day1 && day1.slots.includes("10:00") && !day1.slots.includes("11:00") && !slots.some((x) => x.date === ist(3)), JSON.stringify(day1?.slots?.slice(0, 6)));
  const book = (o) => qp.request.post(`${base}/api/booking`, { data: { name: "Ankit Jain", phone: "9829098290", email: "ankit@jainsarees.test", company: "Jain Sarees", topic: "Website", message: "Need an online saree store with COD.", date: bd1, time: "10:00", startedAt: String(Date.now() - 9000), ...o } });
  r = await book();
  const bj = await r.json();
  ok("client books a call and gets a Meet link", r.status() === 201 && bj.meetLink === "https://meet.google.com/e2e-test-1", JSON.stringify(bj).slice(0, 160));
  const ev = gcal.events[0];
  ok("calendar event invites the client with a Meet request", !!ev && /conferenceDataVersion=1/.test(ev.q) && /sendUpdates=all/.test(ev.q) && ev.body.attendees?.[0]?.email === "ankit@jainsarees.test" && ev.body.start.dateTime.startsWith(`${bd1}T04:30`), JSON.stringify(ev?.body?.start));
  r = await book({ name: "Someone Else", email: "else@x.test" });
  ok("the same time can't be booked twice", r.status() === 409, `status ${r.status()}`);
  const bdoc = await db.collection("bookings").findOne({ token: bj.token });
  const blead = await db.collection("leads").findOne({ bookingId: String(bdoc._id) });
  ok("booking also shows in Leads", blead?.source === "booking" && blead?.followUp === bd1 && /Booked a free call/.test(blead?.message || ""));
  slots = (await (await qp.request.get(`${base}/api/booking/slots`)).json()).days;
  ok("booked time leaves the page", !slots.find((x) => x.date === bd1)?.slots.includes("10:00"));
  r = await qp.request.post(`${base}/api/booking/${bj.token}`, { data: { action: "move", date: bd1, time: "11:00" } });
  ok("can't move into a busy time", r.status() === 409);
  r = await qp.request.post(`${base}/api/booking/${bj.token}`, { data: { action: "move", date: bd1, time: "12:00" } });
  ok("client moves the call", r.status() === 200 && gcal.patches.length === 1 && (await db.collection("bookings").findOne({ token: bj.token })).time === "12:00");
  slots = (await (await qp.request.get(`${base}/api/booking/slots`)).json()).days;
  ok("old time is free again", slots.find((x) => x.date === bd1)?.slots.includes("10:00"));
  // Booking page in the browser.
  const bc = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.25 });
  const bp = await bc.newPage();
  const bd2 = ist(2);
  await bp.goto(`${base}/book`, { waitUntil: "networkidle" }); await bp.waitForSelector(`[data-date="${bd2}"]`, { timeout: 15000 });
  ok("booking page has its own title", (await bp.textContent("h1"))?.replace(/\s+/g, " ").includes("consultation") && (await bp.content()).includes("Book a call"));
  await bp.click(`[data-date="${bd2}"]`); await bp.click(`[data-time="15:00"]`); await bp.waitForTimeout(400);
  await bp.screenshot({ path: `${out}/31-book-page.png`, fullPage: true });
  await bp.click("text=Continue");
  await bp.fill('input[autocomplete="name"]', "Priya Khandelwal"); await bp.fill('input[type="tel"]', "9414011223"); await bp.fill('input[type="email"]', "priya@khandelwalfoods.test"); await bp.fill('input[autocomplete="organization"]', "Khandelwal Foods");
  await bp.waitForTimeout(2600);
  await bp.click("text=Book my free call"); await bp.waitForSelector("text=Your call is booked", { timeout: 15000 }); await bp.waitForTimeout(500);
  ok("booking works in the browser", (await bp.content()).includes("meet.google.com/e2e-test-2"));
  await bp.screenshot({ path: `${out}/32-booked.png`, fullPage: false });
  await bp.goto(`${base}/b/${bj.token}`, { waitUntil: "networkidle" }); await bp.waitForTimeout(400);
  ok("client's own link shows the call", (await bp.content()).includes("Join Google Meet") && (await bp.content()).includes("12:00 PM"));
  await bp.screenshot({ path: `${out}/33-manage-booking.png`, fullPage: false });
  await bp.goto(`${base}/contact`, { waitUntil: "networkidle" });
  ok("contact page shows the book-a-call button", (await bp.content()).includes("Book a free 30-minute call"));
  // Reminders (scheduler).
  const soonStart = new Date(Date.now() + 50 * 60e3);
  await db.collection("bookings").insertOne({ name: "Soon Client", phone: "9000000001", email: "soon@x.test", company: "", topic: "Website", message: "", start: soonStart.toISOString(), end: new Date(soonStart.getTime() + 30 * 60e3).toISOString(), date: ist(0), time: "23:59", token: "soonTokenSoonTokenSoon01", status: "confirmed", meetMode: "google", meetLink: "https://meet.google.com/soon", calendarEventId: "", leadId: "", reminded: { day: true, hour: false }, cancelledBy: "", note: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  r = await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  cj = await r.json();
  ok("scheduler sends the 1-hour reminder", cj.done?.calls?.hour === 1 && (await db.collection("bookings").findOne({ token: "soonTokenSoonTokenSoon01" })).reminded.hour === true, JSON.stringify(cj.done?.calls));
  r = await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  ok("reminder goes only once", (await r.json()).done?.calls?.hour === 0);
  // Admin screens.
  await ap.goto("about:blank"); await ap.goto(`${base}/admin#bookings`); await ap.waitForSelector("text=Priya Khandelwal", { timeout: 15000 }); await ap.waitForTimeout(700);
  await ap.screenshot({ path: `${out}/34-admin-bookings.png`, fullPage: false });
  await ap.click("button:has-text('Settings')"); await ap.waitForSelector("text=When you take calls", { timeout: 10000 }); await ap.waitForTimeout(500);
  await ap.screenshot({ path: `${out}/35-admin-booking-settings.png`, fullPage: false });
  // Cancel and switch off.
  r = await qp.request.post(`${base}/api/booking/${bj.token}`, { data: { action: "cancel" } });
  ok("client cancels and the calendar event goes", r.status() === 200 && gcal.deletes.length === 1 && (await db.collection("bookings").findOne({ token: bj.token })).status === "cancelled");
  r = await qp.request.post(`${base}/api/booking/${bj.token}`, { data: { action: "cancel" } });
  ok("cancelled call can't be cancelled again", r.status() === 400);
  const cur2 = (await (await ap.request.get(`${base}/api/admin/bookings`)).json()).settings;
  await ap.request.put(`${base}/api/admin/bookings/settings`, { data: { ...cur2, enabled: false } });
  await bp.goto(`${base}/book`, { waitUntil: "networkidle" });
  ok("switched off: booking page says closed", (await bp.content()).includes("Online booking is closed"));
  gSrv.closeAllConnections?.(); gSrv.close();

  // ---- Google reviews ----
  let placesHits = 0;
  const pSrv = createServer((rq, rs) => {
    placesHits++;
    rs.setHeader("content-type", "application/json");
    if (rq.headers["x-goog-api-key"] !== "e2e-places-key") { rs.statusCode = 403; return rs.end(JSON.stringify({ error: { message: "API key not valid" } })); }
    rs.end(JSON.stringify({ displayName: { text: "Spinex IT Solutions" }, rating: 4.8, userRatingCount: 37, googleMapsUri: "https://maps.google.com/?cid=123", reviews: [
      { name: "places/x/reviews/a1", rating: 5, relativePublishTimeDescription: "2 weeks ago", text: { text: "Spinex built our e-commerce store in 3 weeks. Orders started coming from day one. Very responsive team." }, authorAttribution: { displayName: "Mahesh Agarwal", photoUri: "", uri: "https://maps.google.com/u/1" } },
      { name: "places/x/reviews/a2", rating: 5, relativePublishTimeDescription: "a month ago", text: { text: "Great work on our Google Business Profile and Instagram. Leads doubled." }, authorAttribution: { displayName: "Sunita Sharma" } },
      { name: "places/x/reviews/a3", rating: 3, relativePublishTimeDescription: "2 months ago", text: { text: "Okay experience, a bit slow." }, authorAttribution: { displayName: "Average Reviewer" } },
      { name: "places/x/reviews/a4", rating: 4, relativePublishTimeDescription: "3 months ago", text: { text: "Good website, fair price." }, authorAttribution: { displayName: "Rohit Saini" } },
      { name: "places/x/reviews/a5", rating: 5, relativePublishTimeDescription: "4 months ago", authorAttribution: { displayName: "No Text" } },
    ] }));
  }).listen(3297);
  const rvCur = (await (await ap.request.get(`${base}/api/admin/reviews`)).json()).settings;
  r = await ap.request.put(`${base}/api/admin/reviews`, { data: { ...rvCur, show: true, mode: "google", placeId: "ChIJe2eTestPlace", minRating: 4, maxReviews: 6, delayDays: 1, reminderDays: 5 } });
  ok("reviews settings save", r.status() === 200);
  r = await ap.request.post(`${base}/api/admin/reviews`, { data: { action: "refresh" } });
  const rg = (await r.json()).google;
  ok("rating and reviews load from Google", r.status() === 200 && rg?.rating === 4.8 && rg?.count === 37 && rg?.reviews?.length === 5, JSON.stringify({ s: r.status(), r: rg?.rating }));
  await bp.goto(`${base}/`, { waitUntil: "networkidle" }); await bp.waitForTimeout(600);
  const home = await bp.content();
  ok("home page shows the Google rating and good reviews", home.includes("Based on 37 Google reviews") && home.includes("Mahesh Agarwal") && home.includes("Rohit Saini") && !home.includes("Average Reviewer") && !home.includes("No Text"));
  const hitsBefore = placesHits;
  await bp.reload({ waitUntil: "networkidle" });
  ok("Google is not asked again on every visit (cached)", placesHits === hitsBefore, `${placesHits - hitsBefore} extra calls`);
  await bp.locator("#google-reviews-title").scrollIntoViewIfNeeded(); await bp.waitForTimeout(800);
  await bp.locator("#google-reviews-title").locator("xpath=ancestor::section").screenshot({ path: `${out}/36-home-google-reviews.png` });
  // Ask for a review when a project is completed (with Client feedback switched off, which would ask first).
  await ap.request.put(`${base}/api/admin/feedback`, { data: { autoOnProjectDone: false } });
  const cl = (await (await ap.request.get(`${base}/api/admin/clients/${cid}`)).json()).client;
  await db.collection("review_requests").deleteMany({});
  r = await ap.request.patch(`${base}/api/admin/clients/${cid}`, { data: { projects: cl.projects.map((p) => (p.id === "p1" ? { ...p, status: "completed" } : p)) } });
  let rq = await db.collection("review_requests").findOne({ email: "rahul@sharmatraders.test" });
  ok("completing a project queues a review request", r.status() === 200 && rq?.source === "project" && rq?.project === "E-commerce website" && rq?.status === "scheduled" && Date.parse(rq.sendAt) > Date.now() + 20 * 3600e3, JSON.stringify({ s: rq?.status, p: rq?.project }));
  await ap.request.patch(`${base}/api/admin/clients/${cid}`, { data: { projects: cl.projects.map((p) => ({ ...p, status: "completed" })) } });
  ok("the same client isn't asked twice", (await db.collection("review_requests").countDocuments({ email: "rahul@sharmatraders.test" })) === 1);
  await db.collection("review_requests").updateOne({ _id: rq._id }, { $set: { sendAt: new Date(Date.now() - 60e3).toISOString() } });
  r = await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  rq = await db.collection("review_requests").findOne({ _id: rq._id });
  ok("scheduler sends the due request", rq.status === "failed" || rq.status === "sent", `${rq.status} (no email server in the test, so "failed" is expected)`);
  r = await qp.request.get(`${base}/r/${rq.token}`, { maxRedirects: 0 });
  const rhtml = await r.text();
  ok("review link opens Google's write-a-review page", r.status() === 200 && rhtml.includes("https://search.google.com/local/writereview?placeid=ChIJe2eTestPlace"), rhtml.slice(0, 200));
  ok("an email scanner opening the link doesn't count as the client", (await db.collection("review_requests").findOne({ _id: rq._id })).status !== "clicked");
  await qp.request.post(`${base}/r/${rq.token}`);
  ok("opening the link is noted", (await db.collection("review_requests").findOne({ _id: rq._id })).status === "clicked");
  r = await ap.request.post(`${base}/api/admin/reviews/requests`, { data: { name: "Neha Agarwal", email: "neha@agarwaljewels.test", phone: "9414055555", project: "Jewellery website" } });
  ok("team can ask a client by hand", r.status() === 201 || r.status() === 502, `status ${r.status()}`);
  await ap.goto("about:blank"); await ap.goto(`${base}/admin#reviews`); await ap.waitForSelector("text=Where the reviews come from", { timeout: 15000 }); await ap.waitForTimeout(600);
  await ap.screenshot({ path: `${out}/37-admin-reviews.png`, fullPage: false });
  await ap.click("text=Ask for reviews"); await ap.waitForSelector("text=Ask automatically", { timeout: 10000 }); await ap.waitForTimeout(500);
  await ap.screenshot({ path: `${out}/38-admin-review-requests.png`, fullPage: true });
  await ap.request.put(`${base}/api/admin/reviews`, { data: { ...rvCur, show: false, placeId: "ChIJe2eTestPlace" } });
  await bp.goto(`${base}/`, { waitUntil: "networkidle" });
  ok("switched off: no reviews on the home page", !(await bp.content()).includes("Based on 37 Google reviews"));
  pSrv.closeAllConnections?.(); pSrv.close();

  // ---- Payment reminders and monthly bills ----
  // A tiny mail server, so emails really go out in this test.
  const mails = [];
  const smtpSrv = createTcpServer((sock) => {
    let mode = "cmd", data = "", rcpt = [], buf = "", authStep = 0;
    const say = (t) => sock.write(t + "\r\n");
    say("220 e2e ESMTP");
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (mode === "data") { if (line === ".") { mails.push({ to: rcpt.join(","), data }); mode = "cmd"; data = ""; rcpt = []; say("250 OK queued"); } else data += line + "\n"; continue; }
        if (authStep === 1) { authStep = 2; say("334 UGFzc3dvcmQ6"); continue; }
        if (authStep === 2) { authStep = 0; say("235 OK"); continue; }
        const cmd = line.toUpperCase();
        if (cmd.startsWith("EHLO") || cmd.startsWith("HELO")) sock.write("250-e2e\r\n250-AUTH PLAIN LOGIN\r\n250 OK\r\n");
        else if (cmd.startsWith("AUTH LOGIN")) { authStep = 1; say("334 VXNlcm5hbWU6"); }
        else if (cmd.startsWith("AUTH")) say("235 OK");
        else if (cmd.startsWith("MAIL")) say("250 OK");
        else if (cmd.startsWith("RCPT")) { rcpt.push(line.replace(/^RCPT TO:\s*/i, "").replace(/[<>]/g, "")); say("250 OK"); }
        else if (cmd === "DATA") { mode = "data"; say("354 go"); }
        else if (cmd === "QUIT") { say("221 bye"); sock.end(); }
        else say("250 OK");
      }
    });
    sock.on("error", () => {});
  }).listen(2526);
  r = await ap.request.put(`${base}/api/admin/secrets`, { data: { keys: { SMTP_HOST: "127.0.0.1", SMTP_PORT: "2526", SMTP_USER: "bot@e2e.test", SMTP_PASS: "e2e-pass", NOTIFY_EMAIL: "owner@e2e.test" } } });
  ok("email settings saved for the test", r.status() === 200, `status ${r.status()}`);
  const { _id: _invId, ...invBase } = inv;
  const mkInv = (n, due, extra = {}) => ({ ...invBase, number: `INV/2026-27/0${n}`, date: ist(-20), dueDate: due, status: "unpaid", paid: 0, shareToken: `e2eReminderToken${n}abcdefgh`, client: { ...inv.client, name: `Client ${n}`, company: `Company ${n}`, email: `client${n}@pay.test`, phone: "" }, items: [{ id: "i1", description: "Website work", sac: "998314", qty: 1, rate: 10000, gst: 0 }], payReminders: [], ...extra });
  const { insertedIds: invIds } = await db.collection("billing").insertMany([mkInv(51, ist(3)), mkInv(52, ist(-4)), mkInv(53, ist(10)), mkInv(54, ist(-4), { status: "paid", paid: 10000 }), mkInv(55, ist(-4), { noReminders: true })]);
  const rmCur = (await (await ap.request.get(`${base}/api/admin/billing/reminders`)).json()).settings;
  r = await ap.request.put(`${base}/api/admin/billing/reminders`, { data: { ...rmCur, enabled: true, steps: "-3, 0, 3, 7, 15", email: true, whatsapp: true, summary: true } });
  ok("payment reminders turned on", r.status() === 200 && (await r.json()).enabled === true);
  const resetDay = () => db.collection("settings").updateOne({ _id: "state:automation" }, { $unset: { "value.lastBilling": "", "value.lastExpenses": "" } });
  await resetDay();
  mails.length = 0;
  r = await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  cj = await r.json();
  const to = (e) => mails.filter((m) => m.to.includes(e));
  ok("reminders go to the invoices that are due", cj.done?.payments?.sent === 2 && to("client51@pay.test").length === 1 && to("client52@pay.test").length === 1, JSON.stringify(cj.done?.payments));
  ok("paid, far-off and stopped invoices get nothing", !to("client53@pay.test").length && !to("client54@pay.test").length && !to("client55@pay.test").length);
  ok("overdue email says it is overdue", /Payment[ _]overdue/.test(to("client52@pay.test")[0]?.data || "") && /Payment[ _]reminder/.test(to("client51@pay.test")[0]?.data || ""));
  ok("you get the list of reminders", mails.some((m) => m.to.includes("owner@e2e.test") && /payment reminder/i.test(m.data)));
  const b52 = await db.collection("billing").findOne({ _id: invIds[1] });
  ok("a late invoice doesn't get several reminders at once", (b52.payReminders ?? []).length === 1 && b52.payReminderKeys?.length === 3, JSON.stringify(b52.payReminderKeys));
  await resetDay();
  mails.length = 0;
  r = await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  ok("the same reminder isn't sent twice", (await r.json()).done?.payments?.sent === 0 && !to("client51@pay.test").length);
  r = await ap.request.post(`${base}/api/admin/billing/${invIds[2]}/remind`, { data: { action: "send" } });
  ok("team sends a reminder by hand", r.status() === 200 && (await r.json()).email === true && to("client53@pay.test").length === 1);
  r = await ap.request.post(`${base}/api/admin/billing/${invIds[0]}/remind`, { data: { action: "pause" } });
  ok("reminders can be stopped for one invoice", (await r.json()).noReminders === true);
  // Monthly bill.
  mails.length = 0;
  const monthName = new Date(`${ist(0).slice(0, 7)}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", timeZone: "UTC" });
  r = await ap.request.post(`${base}/api/admin/recurring`, { data: { title: "SEO retainer", client: { name: "Vikas Gupta", company: "Gupta Motors", email: "vikas@guptamotors.test", phone: "", address: "Tonk Road, Jaipur", state: "Rajasthan", gstin: "" }, items: [{ id: "s1", description: "SEO and Google Business Profile, {month} {year}", sac: "998361", qty: 1, rate: 15000, gst: 18 }], frequency: "monthly", day: 5, nextDate: ist(0), dueDays: 7, autoSend: true } });
  const rec = await r.json();
  ok("monthly bill is set up", r.status() === 201 && rec.nextDate === ist(0), `status ${r.status()}`);
  await resetDay();
  r = await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  cj = await r.json();
  let recInv = await db.collection("billing").findOne({ recurringId: rec.id });
  ok("scheduler makes this month's invoice", cj.done?.recurring?.made === 1 && !!recInv && recInv.items[0].description === `SEO and Google Business Profile, ${monthName} ${ist(0).slice(0, 4)}` && recInv.status === "unpaid", JSON.stringify(cj.done?.recurring));
  ok("the invoice is emailed to the client", mails.some((m) => m.to.includes("vikas@guptamotors.test") && /Invoice[ _]INV/.test(m.data)));
  let recDoc = await db.collection("recurring_bills").findOne({ _id: new ObjectId(rec.id) });
  const nm = new Date(Date.UTC(Number(ist(0).slice(0, 4)), Number(ist(0).slice(5, 7)), 5)).toISOString().slice(0, 10);
  ok("monthly bill moves to the 5th of next month", recDoc.count === 1 && recDoc.nextDate === nm, `${recDoc.nextDate} vs ${nm}`);
  await resetDay();
  await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  ok("no second invoice for the same month", (await db.collection("billing").countDocuments({ recurringId: rec.id })) === 1);
  r = await ap.request.post(`${base}/api/admin/recurring/${rec.id}`, { data: { action: "now" } });
  ok("next invoice can be made early by hand", r.status() === 200 && (await db.collection("billing").countDocuments({ recurringId: rec.id })) === 2);
  r = await ap.request.post(`${base}/api/admin/recurring`, { data: { fromInvoice: String(invIds[2]) } });
  const fromInv = await r.json();
  ok("an invoice can be turned into a monthly bill", r.status() === 201 && /\{period\}/.test(fromInv.items[0].description));
  r = await ap.request.post(`${base}/api/admin/recurring`, { data: { fromInvoice: String(invIds[2]) } });
  ok("pressing it again doesn't make a second monthly bill", r.status() === 409 && (await db.collection("recurring_bills").countDocuments({ fromInvoiceId: String(invIds[2]) })) <= 1, `status ${r.status()}`);
  // Paused for a few months, then resumed: no invoices for the paused months.
  await ap.request.patch(`${base}/api/admin/recurring/${fromInv.id}`, { data: { active: false } });
  await db.collection("recurring_bills").updateOne({ _id: new ObjectId(fromInv.id) }, { $set: { nextDate: ist(-95) } });
  r = await ap.request.patch(`${base}/api/admin/recurring/${fromInv.id}`, { data: { active: true } });
  const resumed = await r.json();
  ok("resuming a paused monthly bill carries on from the next date to come", resumed.active === true && resumed.nextDate >= ist(0), resumed.nextDate);
  await ap.goto("about:blank"); await ap.goto(`${base}/admin#billing`); await ap.waitForSelector("text=Monthly bills", { timeout: 15000 }); await ap.waitForTimeout(800);
  await ap.screenshot({ path: `${out}/39-invoices-overdue.png`, fullPage: false });
  await ap.click("text=Payment reminders"); await ap.waitForSelector("text=Days from the due date", { timeout: 10000 }); await ap.waitForTimeout(400);
  await ap.screenshot({ path: `${out}/40-payment-reminders.png`, fullPage: false });
  await ap.click("button:has-text('Monthly bills')"); await ap.waitForSelector("text=Gupta Motors", { timeout: 10000 }); await ap.waitForTimeout(500);
  await ap.screenshot({ path: `${out}/41-monthly-bills.png`, fullPage: false });
  await ap.goto(`${base}/admin/billing/${invIds[1]}`); await ap.waitForSelector("text=Payment follow-up", { timeout: 15000 }); await ap.locator("text=Payment follow-up").scrollIntoViewIfNeeded(); await ap.waitForTimeout(500);
  await ap.screenshot({ path: `${out}/42-invoice-follow-up.png`, fullPage: false });
  // ---- Client feedback ----
  await ap.request.put(`${base}/api/admin/feedback`, { data: { autoOnProjectDone: true, delayDays: 1, reminderDays: 5, showGoogleAfter: true } });
  r = await ap.request.post(`${base}/api/admin/clients`, { data: { name: "Kavita Mehta", company: "Mehta Sweets", email: "kavita@mehtasweets.test", phone: "9829011122" } });
  const kc = await r.json();
  const proj = { id: "k1", title: "Restaurant website", type: "Website", status: "active", startDate: ist(-30), dueDate: ist(-2), nextStep: "", stages: [], updates: [], links: [] };
  await ap.request.patch(`${base}/api/admin/clients/${kc.id}`, { data: { projects: [proj] } });
  await ap.request.patch(`${base}/api/admin/clients/${kc.id}`, { data: { projects: [{ ...proj, status: "completed" }] } });
  let fbDoc = await db.collection("feedback").findOne({ email: "kavita@mehtasweets.test" });
  ok("completed project asks for feedback (instead of a direct Google request)", fbDoc?.source === "project" && fbDoc?.project === "Restaurant website" && !(await db.collection("review_requests").findOne({ email: "kavita@mehtasweets.test" })));
  await db.collection("feedback").updateOne({ _id: fbDoc._id }, { $set: { sendAt: new Date(Date.now() - 60e3).toISOString() } });
  mails.length = 0;
  await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  fbDoc = await db.collection("feedback").findOne({ _id: fbDoc._id });
  ok("feedback email goes out", fbDoc.status === "sent" && mails.some((m) => m.to.includes("kavita@mehtasweets.test") && m.data.includes(`/f/${fbDoc.token}`)));
  const fc = await browser.newContext({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 1.25 });
  const fpg = await fc.newPage();
  await fpg.goto(`${base}/f/${fbDoc.token}`, { waitUntil: "networkidle" });
  await fpg.click('[data-star="5"]');
  await fpg.fill("textarea >> nth=0", "Mehta ji ki team ne humari restaurant website 2 hafte mein bana di. Online orders shuru ho gaye aur Google pe bhi dikhne lage. Bahut achha kaam!");
  await fpg.fill("textarea >> nth=1", "Thoda pehle update dete to aur achha hota.");
  ok("permission to show it on the website is not ticked for them", !(await fpg.isChecked('input[name="publish"]')));
  await fpg.check('input[name="publish"]');
  await fpg.fill('input[aria-label="Role"]', "Owner");
  await fpg.waitForTimeout(300);
  await fpg.screenshot({ path: `${out}/43-feedback-form.png`, fullPage: true });
  await fpg.click("text=Send feedback"); await fpg.waitForSelector("text=Thank you", { timeout: 15000 }); await fpg.waitForTimeout(400);
  ok("thank-you page invites a Google review", (await fpg.content()).includes("Write a Google review"));
  await fpg.screenshot({ path: `${out}/44-feedback-thanks.png`, fullPage: false });
  r = await qp.request.post(`${base}/api/feedback/${fbDoc.token}`, { data: { rating: 1 } });
  ok("feedback can be sent only once", r.status() === 409);
  fbDoc = await db.collection("feedback").findOne({ _id: fbDoc._id });
  ok("answer is saved", fbDoc.response?.rating === 5 && fbDoc.response?.publish === true && fbDoc.response?.company === "Mehta Sweets" && fbDoc.approval === "pending");
  // Low rating alerts the team.
  r = await ap.request.post(`${base}/api/admin/feedback/requests`, { data: { name: "Unhappy Client", email: "unhappy@client.test", project: "Logo design" } });
  const low = await r.json();
  mails.length = 0;
  r = await qp.request.post(`${base}/api/feedback/${low.token}`, { data: { rating: 2, liked: "", better: "Delivery was late and nobody replied.", publish: false } });
  ok("low rating alerts you", r.status() === 200 && mails.some((m) => m.to.includes("owner@e2e.test") && /Low[ _]rating/.test(m.data)));
  r = await ap.request.post(`${base}/api/admin/feedback/${low.id}`, { data: { action: "approve", quote: "anything here" } });
  ok("feedback the client didn't allow can't go on the website", r.status() === 400);
  // Approve → Testimonials.
  r = await ap.request.post(`${base}/api/admin/feedback/${fbDoc._id}`, { data: { action: "approve", quote: "Mehta ji ki team ne humari restaurant website 2 hafte mein bana di. Online orders shuru ho gaye. Bahut achha kaam!" } });
  const content1 = (await db.collection("settings").findOne({ _id: "content" }))?.data;
  const tst = (content1?.testimonials ?? []).find((t) => t.id?.startsWith("fb-"));
  ok("approved feedback goes to Testimonials", r.status() === 200 && tst?.name === "Kavita Mehta" && tst?.role === "Owner, Mehta Sweets" && tst?.rating === "5", JSON.stringify(tst));
  await bp.goto(`${base}/`, { waitUntil: "networkidle" });
  ok("it shows on the home page", (await bp.content()).includes("Online orders shuru ho gaye"));
  await ap.goto("about:blank"); await ap.goto(`${base}/admin#feedback`); await ap.waitForSelector("text=Average rating", { timeout: 15000 }); await ap.waitForTimeout(600);
  await ap.screenshot({ path: `${out}/45-admin-feedback.png`, fullPage: true });
  r = await ap.request.post(`${base}/api/admin/feedback/${fbDoc._id}`, { data: { action: "unpublish" } });
  const content2 = (await db.collection("settings").findOne({ _id: "content" }))?.data;
  ok("it can be taken off again", r.status() === 200 && !(content2?.testimonials ?? []).some((t) => t.id?.startsWith("fb-")));
  // ---- Expenses, profit and loss, GST summary ----
  await db.collection("settings").updateOne({ _id: "billing" }, { $set: { "value.gstin": "08AAACS1234F1Z5", "value.state": "Rajasthan" } }, { upsert: true });
  const { _id: _accInv, ...accBase } = inv;
  const accInv = (n, date, extra = {}) => ({ ...accBase, number: `INV/E2E/${n}`, date, dueDate: date, status: "unpaid", paid: 0, shareToken: `e2eAccountsToken${n}abcdefghij`, client: { ...inv.client, company: `Acc Client ${n}`, state: "Rajasthan", gstin: "" }, items: [{ id: "i1", description: "Website", sac: "998314", qty: 1, rate: 100000, gst: 18 }], ...extra });
  await db.collection("billing").insertMany([
    accInv(1, "2024-05-10", { status: "paid", paid: 118000 }),
    accInv(2, "2024-05-20", { client: { ...inv.client, company: "Delhi Buyer", state: "", gstin: "07AAAAA0000A1Z5" }, items: [{ id: "i1", description: "App", sac: "998314", qty: 1, rate: 50000, gst: 18 }] }),
    accInv(3, "2024-05-25", { status: "cancelled" }),
    { ...accInv(4, "2024-05-26"), type: "quote", number: "QT/E2E/4" },
  ]);
  const slipBase = { emp: { empCode: "E2E9", name: "Acc Staff", email: "", designation: "Dev", department: "", joiningDate: "2024-01-01", location: "", pan: "", uan: "", bankName: "", bankLast4: "" }, daysInMonth: 31, paidDays: 31, deductions: [], esiOn: false, attendance: null, paymentDate: "", paymentMode: "Bank transfer", note: "", token: "", sentAt: "", createdBy: "E2E", createdAt: now.toISOString(), updatedAt: now.toISOString() };
  await db.collection("payslips").insertMany([
    { ...slipBase, month: "2024-05", employeeId: "e2e-acc-1", earnings: [{ id: "a", label: "Basic", amount: 20000 }, { id: "b", label: "HRA", amount: 10000 }], number: "PS/E2E/1", verifyCode: "SPX-P-E2EACC1", status: "issued", issuedAt: now.toISOString() },
    { ...slipBase, month: "2024-05", employeeId: "e2e-acc-2", earnings: [{ id: "a", label: "Basic", amount: 99999 }], number: "", verifyCode: "", status: "draft", issuedAt: "" },
  ]);
  r = await ap.request.post(`${base}/api/admin/expenses`, { data: { date: "2024-05-03", category: "Rent", vendor: "Landlord" } });
  ok("an expense needs an amount", r.status() === 400);
  for (const e of [
    { date: "2024-05-01", category: "Rent", vendor: "Landlord", description: "Office rent May", amount: 20000, gst: 0 },
    { date: "2024-05-15", category: "Software and tools", vendor: "Figma", amount: 10000, gst: 1800, vendorGstin: "29abcde1234f1z5", billNo: "FG-881" },
    { date: "2024-05-20", category: "Ads and marketing", vendor: "Local printer", amount: 5000, gst: 900 },
  ]) r = await ap.request.post(`${base}/api/admin/expenses`, { data: e });
  ok("expenses are added", r.status() === 201 && (await db.collection("expenses").countDocuments({ date: { $gte: "2024-05-01", $lte: "2024-05-31" } })) === 3);
  const figma = await db.collection("expenses").findOne({ vendor: "Figma" });
  ok("vendor GSTIN is cleaned up", figma?.vendorGstin === "29ABCDE1234F1Z5");
  const rep = await (await ap.request.get(`${base}/api/admin/accounts/report?fy=2024-25`)).json();
  const may = rep.months?.find((m) => m.month === "2024-05");
  ok("profit and loss: sales, expenses and salaries for the month", rep.months?.length === 12 && rep.months[0].month === "2024-04" && rep.months[11].month === "2025-03" && may?.sales === 150000 && may?.expenses === 35900 && may?.salaries === 30000 && may?.profit === 84100, JSON.stringify(may));
  ok("cancelled invoices, quotations and draft payslips aren't counted", may?.invoiced === 177000 && may?.received === 118000 && may?.gstOut === 27000 && may?.gstIn === 1800);
  ok("GST on a bill without the vendor's GSTIN counts as a cost (it can't be claimed back)", may?.byCategory?.["Ads and marketing"] === 5900);
  ok("expenses by category", may?.byCategory?.Rent === 20000 && may?.byCategory?.["Software and tools"] === 10000 && rep.totals?.profit === 84100);
  const gst = await (await ap.request.get(`${base}/api/admin/accounts/gst?from=2024-05-01&to=2024-05-31`)).json();
  const gt = gst.totals || {};
  ok("GST summary: CGST, SGST and IGST collected", gt.cgst === 9000 && gt.sgst === 9000 && gt.igst === 9000 && gt.gstOut === 27000 && gst.sales?.length === 2, JSON.stringify(gt));
  ok("GST to pay = collected minus input credit (only bills with the vendor's GSTIN)", gt.gstIn === 2700 && gt.eligibleIn === 1800 && gt.payable === 25200);
  ok("B2B invoice shows the client's GSTIN", gst.sales?.find((s) => s.number === "INV/E2E/2")?.type === "B2B" && gst.sales?.find((s) => s.number === "INV/E2E/1")?.type === "B2C");
  r = await ap.request.get(`${base}/api/admin/accounts/gst?from=2024-05-01&to=2024-05-31&format=csv`);
  const gcsv = await r.text();
  ok("GST file for the CA downloads", /text\/csv/.test(r.headers()["content-type"] || "") && gcsv.includes("GST to pay") && gcsv.includes("25200") && gcsv.includes("INV/E2E/2") && gcsv.includes("FG-881"));
  r = await ap.request.get(`${base}/api/admin/accounts/report?fy=2024-25&format=csv`);
  ok("profit and loss file downloads", (await r.text()).includes("May 2024"));
  r = await qp.request.get(`${base}/api/admin/accounts/report`);
  ok("someone not logged in can't see the accounts", r.status() === 401 || r.status() === 403, `status ${r.status()}`);
  // Expense that repeats every month (rent): next month's copy is made by the scheduler.
  r = await ap.request.post(`${base}/api/admin/expenses`, { data: { date: ist(-35), category: "Rent", vendor: "Office landlord", description: "Monthly rent", amount: 15000, repeat: true } });
  const rentId = (await r.json()).id;
  await resetDay();
  await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  await resetDay();
  await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  const rents = await db.collection("expenses").find({ vendor: "Office landlord" }).sort({ date: 1 }).toArray();
  ok("repeating expense is added next month, once", rents.length === 2 && rents[0].copiedTo === String(rents[1]._id) && rents[1].repeat === true && rents[1].amount === 15000 && rents[1].date > rents[0].date && rents[1].date <= ist(0), JSON.stringify(rents.map((x) => x.date)));
  r = await ap.request.patch(`${base}/api/admin/expenses/${rentId}`, { data: { amount: 16000 } });
  ok("an expense can be changed", r.status() === 200 && (await r.json()).amount === 16000);
  // A few months of this year's expenses, for the screenshots.
  const thisFy = (() => { const y = Number(ist(0).slice(0, 4)), m = Number(ist(0).slice(5, 7)); return m >= 4 ? y : y - 1; })();
  const fyMonth = (i) => { const m = ((3 + i) % 12) + 1; return `${m <= 3 ? thisFy + 1 : thisFy}-${String(m).padStart(2, "0")}`; };
  const demo = [];
  for (let i = 0; i < 12; i++) {
    const m = fyMonth(i);
    if (`${m}-01` > ist(0)) break;
    demo.push({ date: `${m}-01`, category: "Rent", vendor: "Office landlord", description: "Office rent", amount: 18000, gst: 0, vendorGstin: "", billNo: "", paidVia: "Bank transfer", repeat: false, copiedTo: "", createdBy: "E2E", createdAt: now.toISOString(), updatedAt: now.toISOString() });
    demo.push({ date: `${m}-05`, category: "Software and tools", vendor: "Google Workspace", description: "Email for 6 people", amount: 4800, gst: 864, vendorGstin: "29AACCG0527D1Z8", billNo: `GW-${i}`, paidVia: "Card", repeat: false, copiedTo: "", createdBy: "E2E", createdAt: now.toISOString(), updatedAt: now.toISOString() });
    demo.push({ date: `${m}-12`, category: "Ads and marketing", vendor: "Meta Ads", description: "Lead ads", amount: 12000 + i * 1500, gst: (12000 + i * 1500) * 0.18, vendorGstin: "", billNo: "", paidVia: "Card", repeat: false, copiedTo: "", createdBy: "E2E", createdAt: now.toISOString(), updatedAt: now.toISOString() });
    if (i % 2) demo.push({ date: `${m}-20`, category: "Freelancers", vendor: "Rohit (designer)", description: "Logo and banners", amount: 15000, gst: 0, vendorGstin: "", billNo: "", paidVia: "UPI", repeat: false, copiedTo: "", createdBy: "E2E", createdAt: now.toISOString(), updatedAt: now.toISOString() });
    await db.collection("billing").insertOne(accInv(`D${i}`, `${m}-08`, { status: i % 3 ? "paid" : "unpaid", paid: i % 3 ? 70800 : 0, items: [{ id: "i1", description: "Website and SEO", sac: "998314", qty: 1, rate: 60000 + i * 9000, gst: 18 }] }));
  }
  await db.collection("expenses").insertMany(demo);
  await ap.goto("about:blank"); await ap.goto(`${base}/admin#accounts`); await ap.waitForSelector("text=Month by month", { timeout: 15000 }); await ap.waitForTimeout(800);
  await ap.screenshot({ path: `${out}/46-profit-loss.png`, fullPage: true });
  const barBox = await ap.locator("[data-bar]").nth(6).boundingBox();
  ok("monthly chart bars are drawn", !!barBox && barBox.height > 20 && barBox.width > 5, JSON.stringify(barBox));
  await ap.click('[role="tab"]:has-text("Expenses")'); await ap.waitForSelector("[data-expense]", { timeout: 15000 }); await ap.waitForTimeout(500);
  await ap.screenshot({ path: `${out}/47-expenses.png`, fullPage: true });
  await ap.click("text=Add expense"); await ap.waitForSelector('input[name="vendor"]');
  await ap.selectOption('select[name="category"]', "Freelancers");
  await ap.fill('input[name="vendor"]', "Ankit (video editor)");
  await ap.fill('input[name="description"]', "Reels for client");
  await ap.fill('input[name="amount"]', "8000");
  await ap.waitForTimeout(400);
  await ap.screenshot({ path: `${out}/48-add-expense.png`, fullPage: false });
  await ap.click('form button:has-text("Add expense")'); await ap.waitForSelector("text=Expense of", { timeout: 15000 });
  ok("expense added from the admin screen", !!(await db.collection("expenses").findOne({ vendor: "Ankit (video editor)", amount: 8000, category: "Freelancers" })));
  await ap.click('[role="tab"]:has-text("GST for CA")'); await ap.waitForSelector("[data-gst-payable]", { timeout: 15000 });
  await ap.selectOption('select[aria-label="Period"]', "this"); await ap.waitForTimeout(1200);
  await ap.screenshot({ path: `${out}/49-gst-summary.png`, fullPage: true });

  // ---- Automatic follow-up emails to new leads ----
  r = await ap.request.put(`${base}/api/admin/lead-followups`, { data: { enabled: true, fromHour: 0, toHour: 24 } });
  const fu = (await r.json()).settings;
  ok("follow-up emails turned on (day 2 and day 5)", r.status() === 200 && fu.enabled && !!fu.enabledAt && fu.steps.map((x) => x.day).join(",") === "2,5");
  await db.collection("settings").updateOne({ _id: "lead_followups" }, { $set: { "value.enabledAt": new Date(Date.now() - 8 * 864e5).toISOString() } });
  const ago = (d) => new Date(Date.now() - d * 864e5).toISOString();
  const lead = (n, status, days, extra = {}) => ({ name: `Follow Lead ${n}`, phone: "9800000000", email: `fu${n}@lead.test`, services: "E-commerce website", budget: "", message: "", plan: "", source: "contact", status, value: "", followUp: "", followUpNote: "", assignedTo: "", assignedName: "", notes: "", createdAt: ago(days), updatedAt: ago(days), ...extra });
  await db.collection("leads").insertMany([lead(0, "new", 9), lead(1, "new", 2.2), lead(2, "contacted", 2.2), lead(3, "new", 5.3), lead(4, "new", 1), lead(5, "new", 2.5, { noFollowups: true }), lead(6, "new", 2.3, { email: "" })]);
  mails.length = 0;
  r = await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  cj = await r.json();
  const fmail = (n) => mails.filter((m) => m.to.includes(`fu${n}@lead.test`)).map((m) => m.data.replace(/=\r?\n/g, ""));
  ok("day 2 follow-up goes to a new lead", fmail(1).length === 1 && /recent work/.test(fmail(1)[0]) && fmail(1)[0].includes("/stop-emails/"), JSON.stringify(cj.done?.followups));
  ok("a lead past day 5 gets only the day 5 email", fmail(3).length === 1 && /Still planning/.test(fmail(3)[0]));
  ok("contacted, too-new, stopped, no-email and old leads get nothing", [0, 2, 4, 5].every((n) => !fmail(n).length));
  let l1 = await db.collection("leads").findOne({ email: "fu1@lead.test" });
  ok("the lead keeps a record of what was sent", l1.followups?.length === 1 && l1.followups[0].ok && l1.followups[0].day === 2 && !!l1.unsubToken);
  mails.length = 0;
  await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  ok("it is sent only once", !fmail(1).length && !fmail(3).length);
  await db.collection("leads").updateOne({ _id: l1._id }, { $set: { createdAt: ago(5.1) } });
  await qp.request.get(`${base}${cronUrl.pathname}${cronUrl.search}`);
  ok("then the day 5 email", fmail(1).length === 1 && /Still planning/.test(fmail(1)[0]));
  const l3 = await db.collection("leads").findOne({ email: "fu3@lead.test" });
  r = await ap.request.patch(`${base}/api/admin/leads/${l3._id}`, { data: { noFollowups: true } });
  ok("follow-ups can be stopped for one lead", r.status() === 200 && (await db.collection("leads").findOne({ _id: l3._id })).noFollowups === true);
  r = await ap.request.post(`${base}/api/admin/lead-followups`, { data: { step: 0 } });
  const pv = await r.json();
  ok("preview fills in the name and service", pv.subject?.includes("Rahul") && pv.paras?.join(" ").includes("Website design"));
  mails.length = 0;
  r = await ap.request.post(`${base}/api/admin/lead-followups`, { data: { step: 1, sendTo: true } });
  ok("send me a test", r.status() === 200 && mails.some((m) => m.to.includes("owner@e2e.test") && /Test/.test(m.data)));
  l1 = await db.collection("leads").findOne({ _id: l1._id });
  const stp = await (await browser.newContext({ viewport: { width: 900, height: 800 }, deviceScaleFactor: 1.25 })).newPage();
  await stp.goto(`${base}/stop-emails/${l1.unsubToken}`, { waitUntil: "networkidle" });
  await stp.screenshot({ path: `${out}/50-stop-emails.png`, fullPage: false });
  await stp.click("text=Stop the emails"); await stp.waitForSelector("text=no more follow-up emails", { timeout: 15000 }); await stp.waitForTimeout(300);
  await stp.screenshot({ path: `${out}/51-stop-emails-done.png`, fullPage: false });
  ok("the person can stop the emails from the link", (await db.collection("leads").findOne({ _id: l1._id })).noFollowups === true);
  await ap.goto("about:blank"); await ap.goto(`${base}/admin#leads`); await ap.waitForSelector("text=Follow-up emails", { timeout: 15000 });
  await ap.click("button:has-text('Follow-up emails')"); await ap.waitForSelector("[data-step]", { timeout: 15000 });
  await ap.click("[data-step='0'] >> text=Preview"); await ap.waitForSelector("[data-preview]", { timeout: 15000 }); await ap.waitForTimeout(500);
  await ap.screenshot({ path: `${out}/52-followup-settings.png`, fullPage: true });
  await ap.keyboard.press("Escape"); await ap.waitForTimeout(400);
  await ap.click("text=Follow Lead 1").catch(() => undefined);
  await ap.waitForSelector("[data-followups]", { timeout: 8000 }).then(() => ap.waitForTimeout(400)).then(() => ap.screenshot({ path: `${out}/53-lead-followups.png`, fullPage: false })).catch(() => undefined);
  await db.collection("settings").updateOne({ _id: "billing" }, { $set: { "value.gstin": "" } });
  // ---- More ready-made team roles ----
  const roleUser = async (role, email) => {
    const rr = await ap.request.post(`${base}/api/admin/users`, { data: { name: `E2E ${role}`, email, role, password: "Role-pass-2026!" } });
    const u = await rr.json();
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.25 });
    const p = await c.newPage();
    const lr = await p.request.post(`${base}/api/auth/login`, { data: { email, password: "Role-pass-2026!" } });
    return { u, p, status: rr.status(), login: lr.status() };
  };
  const tc = await roleUser("telecaller", "telecaller@e2e.test");
  ok("telecaller role can be added and log in", tc.status === 201 && tc.u.role === "telecaller" && tc.u.access?.leads === "edit" && tc.u.access?.billing === "none" && tc.login === 200, `${tc.status} ${tc.login}`);
  const stOf = async (p, url) => (await p.request.get(`${base}${url}`)).status();
  ok("telecaller sees leads but not invoices, expenses or payslips", (await stOf(tc.p, "/api/admin/leads")) === 200 && (await stOf(tc.p, "/api/admin/billing")) === 403 && (await stOf(tc.p, "/api/admin/expenses")) === 403 && (await stOf(tc.p, "/api/admin/payroll/payslips")) === 403);
  const tcBook = await tc.p.request.put(`${base}/api/admin/bookings/settings`, { data: { enabled: false } });
  const tcFu = await tc.p.request.put(`${base}/api/admin/lead-followups`, { data: { enabled: false } });
  ok("telecaller can't switch off call booking or change automatic emails", tcBook.status() === 403 && tcFu.status() === 403, `${tcBook.status()} ${tcFu.status()}`);
  const ac = await roleUser("accountant", "accountant@e2e.test");
  ok("accountant can work on invoices and expenses, not leads or website", ac.login === 200 && (await stOf(ac.p, "/api/admin/billing")) === 200 && (await stOf(ac.p, "/api/admin/accounts/report")) === 200 && (await stOf(ac.p, "/api/admin/leads")) === 403);
  const vw = await roleUser("viewer", "viewer@e2e.test");
  const vr = await vw.p.request.post(`${base}/api/admin/expenses`, { data: { date: ist(0), category: "Other", vendor: "x", amount: 10 } });
  const vl = await vw.p.request.patch(`${base}/api/admin/leads/${l3._id}`, { data: { notes: "viewer was here" } });
  ok("viewer can look at leads but change nothing, and can't see profit", vw.login === 200 && (await stOf(vw.p, "/api/admin/leads")) === 200 && vl.status() === 403 && vr.status() === 403 && (await stOf(vw.p, "/api/admin/accounts/report")) === 403);
  r = await ap.request.post(`${base}/api/admin/users`, { data: { name: "Bad", email: "bad@e2e.test", role: "owner", password: "Role-pass-2026!" } });
  ok("nobody can be made a second owner", (await r.json()).role !== "owner");
  await ap.goto("about:blank"); await ap.goto(`${base}/admin#team`); await ap.waitForSelector("[data-role='telecaller']", { timeout: 15000 }); await ap.waitForTimeout(500);
  await ap.locator("text=Ready-made roles").scrollIntoViewIfNeeded();
  await ap.screenshot({ path: `${out}/54-team-roles.png`, fullPage: true });
  await ap.click('button:has-text("Add member")').catch(() => undefined);
  await ap.waitForTimeout(500);
  await ap.selectOption("select:has(option[value='accountant'])", "accountant").catch(() => undefined);
  await ap.waitForTimeout(400);
  await ap.screenshot({ path: `${out}/55-add-accountant.png`, fullPage: false });
  // ---- Sweep: every admin section and public page, desktop and phone ----
  {
    const { readFileSync } = await import("node:fs");
    const ids = [...new Set([...readFileSync("components/admin/AdminApp.tsx", "utf8").matchAll(/\{ id: "([a-zA-Z]+)", label: "[^"]+", Icon:/g)].map((m) => m[1]))];
    const tokenOf = async (col, q = {}) => (await db.collection(col).findOne({ token: { $type: "string", $ne: "" }, ...q }))?.token;
    const pub = ["/", "/about", "/services", "/work", "/products", "/blog", "/careers", "/internship", "/contact", "/book", "/website-development-jaipur", "/company-profile", "/verify", "/privacy", "/terms", "/refund", "/portal/login", "/staff/login"];
    const tokens = [["d", inv.shareToken], ["d", openQuote.shareToken], ["l", await tokenOf("letters")], ["p", await tokenOf("payslips", { status: "issued" })], ["b", await tokenOf("bookings")], ["f", await tokenOf("feedback")]].filter(([, t]) => t).map(([k, t]) => `/${k}/${t}`);
    const state = await admin.storageState();
    const check = async (ctx, url, label, shotName) => {
      const pg = await ctx.newPage();
      const errs = [];
      pg.on("pageerror", (e) => errs.push(`js: ${String(e.message || e).slice(0, 160)}`));
      pg.on("console", (m) => { if (m.type() === "error" && !/favicon|Download the React DevTools/.test(m.text())) errs.push(`console: ${m.text().slice(0, 160)}`); });
      pg.on("response", (res) => { if (res.status() >= 500) errs.push(`${res.status()} ${new URL(res.url()).pathname}`); });
      try {
        const resp = await pg.goto(`${base}${url}`, { waitUntil: "networkidle", timeout: 30000 });
        if (resp && resp.status() >= 400) errs.push(`page ${resp.status()}`);
        await pg.waitForTimeout(700);
        const over = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (over > 4) errs.push(`wider than the screen by ${over}px`);
        if (shotName) await pg.screenshot({ path: `${out}/sweep/${shotName}.png`, fullPage: false });
      } catch (e) { errs.push(`load: ${String(e).slice(0, 120)}`); }
      await pg.close();
      ok(`sweep ${label} ${url}`, errs.length === 0, [...new Set(errs)].slice(0, 4).join(" | "));
    };
    mkdirSync(`${out}/sweep`, { recursive: true });
    const deskAdmin = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: state });
    const phoneAdmin = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: state, isMobile: true, hasTouch: true });
    for (const id of ids) {
      await check(deskAdmin, `/admin#${id}`, "admin desktop");
      await check(phoneAdmin, `/admin#${id}`, "admin phone", `admin-${id}`);
    }
    const deskPub = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const phonePub = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    for (const url of [...pub, ...tokens]) {
      const name = url === "/" ? "home" : url.replace(/^\//, "").replace(/\/[A-Za-z0-9_-]{16,}$/, "").replace(/\//g, "-");
      await check(deskPub, url, "public desktop");
      await check(phonePub, url, "public phone", `public-${name}`);
    }
    const phoneClient = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: await phone.storageState(), isMobile: true, hasTouch: true });
    const phoneStaff = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: await sc.storageState(), isMobile: true, hasTouch: true });
    await check(phoneStaff, "/staff", "staff portal phone", "staff-home");
    await phoneStaff.close();
    for (const url of ["/portal", "/portal/invoices", "/portal/support", "/portal/files"]) await check(phoneClient, url, "client portal phone", `portal-${url.split("/")[2] || "home"}`);
    await Promise.all([deskAdmin, phoneAdmin, deskPub, phonePub, phoneClient].map((c) => c.close()));
  }
  smtpSrv.close();
} catch (e) {
  ok("run", false, String(e).slice(0, 300));
  for (const pg of ctx.pages().concat(browser.contexts().flatMap((c) => c.pages()))) await pg.screenshot({ path: `${out}/error-${Math.random().toString(36).slice(2, 6)}.png`, fullPage: true }).catch(() => undefined);
}
await browser.close();
await mongo.close();
writeFileSync(`${out}/report.txt`, report.join("\n") + "\n");
console.log(report.join("\n"));
process.exit(0);
