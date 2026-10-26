import nodemailer from "nodemailer";
import { getSecret } from "./secrets";

// Give up on a slow or unreachable mail server in reasonable time, so forms aren't held up for long.
const TIMEOUTS = { connectionTimeout: 12000, greetingTimeout: 10000, socketTimeout: 20000 };

// Errors that mean "couldn't reach the mail server" (blocked port, firewall, antivirus mail shield, bad network).
const CONN_ERRORS = new Set(["ETIMEDOUT", "ECONNREFUSED", "ESOCKET", "ECONNECTION", "ECONNRESET", "EDNS", "EHOSTUNREACH", "ENETUNREACH"]);
// A port that worked when the saved one didn't (465 ↔ 587), kept while the server runs.
let workingPort: number | null = null;
let lastError = "";
export const lastEmailError = () => lastError;

function explain(e: unknown, host: string, ports: number[]) {
  const err = e as { code?: string; responseCode?: number; message?: string };
  if (err.responseCode === 535) return "The mail server rejected the email login or password. For Gmail, use a 16-letter App Password made on the same Gmail account (myaccount.google.com/apppasswords).";
  if (err.code && CONN_ERRORS.has(err.code)) return `Couldn't reach ${host} on port ${ports.join(" or ")} (${err.code}). Something on this computer or network is blocking email: often an antivirus "mail shield" or firewall, or the internet provider. Allow Node.js in the firewall/antivirus, or try another network. On a live server this usually works.`;
  return err.message || String(e);
}

// Sends one email with the saved SMTP settings. If the server can't be reached on the saved port, it tries the
// other common port once (465 with SSL, 587 with STARTTLS) and keeps using the one that works.
export async function sendMail(mail: nodemailer.SendMailOptions, timeouts: Partial<typeof TIMEOUTS> = {}) {
  const { SMTP_HOST: host, SMTP_PORT, SMTP_USER: user, SMTP_PASS: pass } = await smtpSettings();
  if (!host || !user || !pass) throw new Error("Email isn't set up (Admin → API keys → Email alerts).");
  const saved = Number(SMTP_PORT) || 465;
  const first = workingPort ?? saved;
  const ports = [first, ...(first === 465 ? [587] : first === 587 ? [465] : [])];
  let last: unknown = null;
  for (const port of ports) {
    try {
      const transport = nodemailer.createTransport({ host, port, secure: port === 465, requireTLS: port === 587, auth: { user, pass }, ...TIMEOUTS, ...timeouts });
      const info = await transport.sendMail(mail);
      if (port !== saved && workingPort !== port) console.warn(`Email: port ${saved} couldn't be reached, port ${port} works. You can save ${port} in Admin → API keys.`);
      workingPort = port === saved ? null : port;
      lastError = "";
      return info;
    } catch (e) {
      last = e;
      if (!CONN_ERRORS.has(String((e as { code?: string }).code))) break;
    }
  }
  lastError = explain(last, host, ports);
  const out = new Error(lastError) as Error & { cause?: unknown };
  out.cause = last;
  throw out;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Sends an alert email if SMTP is configured. Never throws, so a mail problem never blocks a form.
export async function notifyAdmin(subject: string, rows: [string, string][], link?: string) {
  // Tidy values copied with spaces or quotes (Gmail shows app passwords as "abcd efgh ijkl mnop").
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL } = await smtpSettings();
  const missing = Object.entries({ SMTP_HOST, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL }).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.warn(`Alert email skipped: ${missing.join(", ")} not set (Admin → API keys, or .env.local).`);
    return false;
  }
  void SMTP_PORT;
  try {
    const table = rows
      .filter(([, v]) => v)
      .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#625C74;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#120F1B;white-space:pre-wrap">${esc(v)}</td></tr>`)
      .join("");
    await sendMail({
      from: `"Spinex website" <${SMTP_USER}>`,
      to: NOTIFY_EMAIL,
      subject,
      text: rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n") + (link ? `\n\nOpen admin: ${link}` : ""),
      html: `<div style="font-family:Arial,sans-serif;font-size:15px"><h2 style="margin:0 0 12px;color:#120F1B">${esc(subject)}</h2><table>${table}</table>${
        link ? `<p style="margin-top:20px"><a href="${esc(link)}" style="background:#120F1B;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Open admin panel</a></p>` : ""
      }</div>`,
    });
    console.log(`Alert email sent to ${NOTIFY_EMAIL}`);
    return true;
  } catch (e) {
    console.error(`Alert email failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

// SMTP settings from Admin → API keys, falling back to .env.local.
export async function smtpSettings() {
  const [SMTP_HOST, port, SMTP_USER, pass, NOTIFY_EMAIL] = await Promise.all(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "NOTIFY_EMAIL"].map(getSecret));
  return { SMTP_HOST, SMTP_PORT: port || "465", SMTP_USER, SMTP_PASS: pass.replace(/\s+/g, ""), NOTIFY_EMAIL };
}

async function smtp() {
  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass, NOTIFY_EMAIL } = await smtpSettings();
  if (!host || !user || !pass) return null;
  return { transport: { sendMail: (m: nodemailer.SendMailOptions) => sendMail(m) }, from: user, replyTo: NOTIFY_EMAIL || user };
}

const wrap = (title: string, paragraphs: string[], button?: { label: string; url: string }) => `
<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#120F1B;max-width:560px">
  <div style="background:#120F1B;color:#fff;padding:20px 24px;border-radius:16px 16px 0 0;font-size:18px;font-weight:bold">Spinex IT Solutions</div>
  <div style="border:1px solid #E6E2EF;border-top:0;padding:24px;border-radius:0 0 16px 16px">
    <h2 style="margin:0 0 14px;font-size:20px">${esc(title)}</h2>
    ${paragraphs.map((p) => `<p style="margin:0 0 12px;white-space:pre-line">${esc(p)}</p>`).join("")}
    ${button ? `<p style="margin:20px 0 4px"><a href="${esc(button.url)}" style="background:#6E59D9;color:#fff;padding:11px 20px;border-radius:999px;text-decoration:none">${esc(button.label)}</a></p>` : ""}
  </div>
</div>`;

// Email to an applicant or intern. Returns false if email isn't set up or sending failed.
export async function emailPerson(to: string, subject: string, title: string, paragraphs: string[], button?: { label: string; url: string }) {
  const s = await smtp();
  if (!s || !to) return false;
  try {
    await s.transport.sendMail({
      from: `"Spinex IT Solutions" <${s.from}>`,
      replyTo: s.replyTo,
      to,
      subject,
      text: paragraphs.join("\n\n") + (button ? `\n\n${button.label}: ${button.url}` : ""),
      html: wrap(title, paragraphs, button),
    });
    return true;
  } catch (e) {
    console.error(`Email to ${to} failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

// Email with one file attached (used for database backups). Returns false if email isn't set up or sending failed.
export async function emailFile(to: string, subject: string, text: string, file: { filename: string; content: Buffer; contentType: string }) {
  const { SMTP_HOST: host, SMTP_PORT, SMTP_USER: user, SMTP_PASS: pass } = await smtpSettings();
  if (!host || !user || !pass || !to) return false;
  try {
    void SMTP_PORT;
    // A bigger file needs more time to upload than the quick alert emails.
    await sendMail({ from: `"Spinex website" <${user}>`, to, subject, text, attachments: [file] }, { socketTimeout: 120000 });
    return true;
  } catch (e) {
    console.error("Email with attachment failed:", e);
    return false;
  }
}
