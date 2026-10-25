// End-to-end check of the client portal on GitHub (real MongoDB, real browser).
// Seeds made-up data, logs in as a client and as the owner, checks access rules and saves screenshots.
// Usage: node scripts/portal-e2e.mjs http://localhost:3200 /tmp/portal
import { createHash, createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
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
  ok("lead is kept even when the token fails", r.status() === 200 && ml?.adIncomplete === true && /700000002/.test(ml?.message || ""));
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
  ok("setup screen shows both working", !!st.state?.lastMeta && !!st.state?.lastGoogle && st.meta.appSecret && st.google.key);
  graphSrv.close();
  await ap.goto("about:blank"); await ap.goto(`${base}/admin#leads`); await ap.waitForSelector("text=Rakesh Meena", { timeout: 15000 }); await ap.waitForTimeout(800);
  await ap.screenshot({ path: `${out}/29-leads-from-ads.png`, fullPage: false });
  await ap.click("text=Get leads from ads"); await ap.waitForSelector("text=Callback URL for Meta", { timeout: 10000 }); await ap.waitForTimeout(600);
  await ap.screenshot({ path: `${out}/30-ads-setup.png`, fullPage: false });
} catch (e) {
  ok("run", false, String(e).slice(0, 300));
  for (const pg of ctx.pages().concat(browser.contexts().flatMap((c) => c.pages()))) await pg.screenshot({ path: `${out}/error-${Math.random().toString(36).slice(2, 6)}.png`, fullPage: true }).catch(() => undefined);
}
await browser.close();
await mongo.close();
writeFileSync(`${out}/report.txt`, report.join("\n") + "\n");
console.log(report.join("\n"));
