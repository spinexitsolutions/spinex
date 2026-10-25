// Server only. AMC renewal reminders, run once a day by the scheduler (app/api/cron).
import { clientsCol, toClient } from "./portal-db";
import { amcDaysLeft, shortDate, todayIndia, type AmcPlan, type PortalClient } from "./portal";
import { emailPerson, notifyAdmin } from "./notify";
import { sendWhatsAppAlert } from "./whatsapp-alert";
import { inr } from "./billing";
import { writeState } from "./settings-db";

// "30, 7, 1, 0" → [30, 7, 1, 0]. 0 = on the last day. Only 0–120 days before the end.
export function remindDays(text: string) {
  const days = Array.from(new Set(String(text).split(/[\s,]+/).map((x) => Math.round(Number(x))).filter((n) => Number.isFinite(n) && n >= 0 && n <= 120)));
  return (days.length ? days : [30, 7, 1, 0]).sort((a, b) => b - a);
}

// Which reminder is due now: the closest step the plan has reached. A missed day still sends it (once).
// Also one "has ended" reminder up to 7 days after the end.
export function dueStep(a: Pick<AmcPlan, "endDate" | "sent" | "remind">, days: number[], today = todayIndia()) {
  if (!a.remind || !a.endDate) return null;
  const left = amcDaysLeft(a, today);
  if (!Number.isFinite(left) || left < -7) return null;
  const steps = [...days, -1];
  const reached = steps.filter((d) => (d === -1 ? left < 0 : left <= d));
  if (!reached.length) return null;
  const step = Math.min(...reached);
  const key = `${a.endDate}:${step}`;
  if (a.sent.includes(key)) return null;
  // Marking the earlier steps too stops a late plan from getting several emails in a row.
  return { step, left, keys: steps.filter((d) => d >= step).map((d) => `${a.endDate}:${d}`) };
}

export function amcEmail(c: PortalClient, a: AmcPlan, left: number, origin: string) {
  const first = c.name.split(" ")[0] || "there";
  const ends = shortDate(a.endDate);
  const subject = left > 0 ? `Your ${a.title} ends in ${left} day${left === 1 ? "" : "s"}` : left === 0 ? `Your ${a.title} ends today` : `Your ${a.title} has ended`;
  const title = left >= 0 ? "Time to renew your maintenance plan" : "Your maintenance plan has ended";
  const covers = a.covers.split("\n").map((x) => x.trim()).filter(Boolean).map((x) => `• ${x}`).join("\n");
  const paragraphs = [
    `Hi ${first},`,
    left >= 0
      ? `Your ${a.title} with Spinex IT Solutions ${left === 0 ? "ends today" : `ends on ${ends}`}. Renew it to keep your website looked after without a break.`
      : `Your ${a.title} with Spinex IT Solutions ended on ${ends}. Until it is renewed, support requests are handled as separate paid work.`,
    ...(a.amount > 0 ? [`Renewal for one more year: ${inr(a.amount, 0)} + GST if applicable.`] : []),
    ...(covers ? [`What the plan includes:\n${covers}`] : []),
    c.active ? "To renew, press the button below or simply reply to this email. We will send the invoice, which you can pay online." : "To renew, simply reply to this email and we will send the invoice.",
  ];
  const button = c.active ? { label: "Renew my plan", url: `${origin}/portal/support?renew=${encodeURIComponent(a.id)}` } : undefined;
  return { subject, title, paragraphs, button };
}

export async function runAmcReminders(origin: string, opts: { days: string; emailClient: boolean; whatsapp: boolean }) {
  const today = todayIndia();
  const days = remindDays(opts.days);
  const col = await clientsCol();
  const docs = await col.find({ "amcs.0": { $exists: true } }).limit(5000).toArray();
  const lines: string[] = [];
  let clientEmails = 0;
  for (const d of docs) {
    const c = toClient(d);
    for (const a of c.amcs) {
      const due = dueStep(a, days, today);
      if (!due) continue;
      let ok = true;
      if (opts.emailClient && c.email) {
        const m = amcEmail(c, a, due.left, origin);
        ok = await emailPerson(c.email, m.subject, m.title, m.paragraphs, m.button);
        if (ok) clientEmails++;
      }
      const when = due.left > 0 ? `ends in ${due.left} day${due.left === 1 ? "" : "s"} (${shortDate(a.endDate)})` : due.left === 0 ? "ends today" : `ended ${shortDate(a.endDate)}`;
      lines.push(`• ${c.company || c.name}: ${a.title} ${when}${a.amount ? `, ${inr(a.amount, 0)}` : ""}${opts.emailClient ? (c.email ? (ok ? " · client emailed" : " · client email failed") : " · no client email") : ""}`);
      // Marked as sent only when the client email went out (or client emails are off), so a failed email is tried again tomorrow.
      if (ok) await col.updateOne({ _id: d._id }, { $addToSet: { "amcs.$[a].sent": { $each: due.keys } } } as never, { arrayFilters: [{ "a.id": a.id }] });
    }
  }
  if (lines.length) {
    await notifyAdmin(`${lines.length} AMC renewal${lines.length > 1 ? "s" : ""} due`, [["Renewals", lines.join("\n")], ["Next step", "Open the client, press “Make renewal invoice”, then “Renew for 1 year” once paid."]], `${origin}/admin#clients`).catch(() => undefined);
    if (opts.whatsapp) await sendWhatsAppAlert(`🔁 AMC renewals due\n\n${lines.slice(0, 12).join("\n")}${lines.length > 12 ? `\n…and ${lines.length - 12} more` : ""}\n\n${origin}/admin#clients`).catch(() => undefined);
  }
  const result = lines.length ? `${lines.length} due, ${clientEmails} client email${clientEmails === 1 ? "" : "s"} sent` : "No AMC renewals due";
  await writeState("automation", { lastAmc: today, lastAmcResult: result });
  return { due: lines.length, clientEmails };
}
