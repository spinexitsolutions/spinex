import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { getClientSession } from "@/lib/client-auth";
import { pOid, ticketsCol, toTicket } from "@/lib/portal-db";
import { amcStateLabel, coveringAmc, mainAmc, shortDate, ticketKindLabel, ticketStatusLabel, type Ticket } from "@/lib/portal";
import { NewTicket, TicketReply } from "@/components/portal/TicketForms";

const tone: Record<Ticket["status"], string> = { open: "bg-amber-50 text-amber-800", answered: "bg-lav-100 text-lav-700", closed: "bg-mist text-muted" };

export default async function PortalSupport({ searchParams }: { searchParams: { t?: string; new?: string; project?: string; renew?: string } }) {
  const client = await getClientSession();
  if (!client) redirect("/portal/login");
  const col = await ticketsCol();
  const projects = client.projects.map((p) => ({ id: p.id, title: p.title }));
  const cover = coveringAmc(client.amcs);
  const plan = cover ?? mainAmc(client.amcs);
  const amc = plan ? { title: plan.title, covered: !!cover, label: amcStateLabel(plan), responseTime: plan.responseTime } : null;
  const renewPlan = searchParams.renew ? client.amcs.find((a) => a.id === searchParams.renew) : undefined;

  const _id = searchParams.t ? pOid(searchParams.t) : null;
  if (_id) {
    const doc = await col.findOneAndUpdate({ _id, clientId: client.id }, { $set: { clientUnread: false } }, { returnDocument: "after" });
    if (doc) {
      const t = toTicket(doc);
      return (
        <div className="mx-auto max-w-3xl">
          <Link href="/portal/support" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={15} /> All requests</Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{t.subject}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone[t.status]}`}>{ticketStatusLabel[t.status]}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{ticketKindLabel[t.kind]}{t.urgent ? " · Urgent" : ""}{t.amcCovered ? ` · Covered by ${t.amcTitle}` : ""}</p>
          <div className="mt-6 space-y-3">
            {t.messages.map((m) => (
              <div key={m.id} className={`rounded-[20px] p-5 ${m.from === "team" ? "mr-6 border border-lav-200 bg-lav-100/50" : "ml-6 border border-line bg-white"}`}>
                <p className="text-xs text-muted"><b className="text-ink">{m.from === "team" ? `${m.name} (team)` : "You"}</b> · {new Date(m.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                <p className="mt-1.5 whitespace-pre-line text-sm">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6"><TicketReply id={t.id} closed={t.status === "closed"} /></div>
        </div>
      );
    }
  }

  const tickets = (await col.find({ clientId: client.id }).sort({ updatedAt: -1 }).limit(200).toArray()).map(toTicket);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Support</h1>
      <p className="mt-1 text-muted">Ask for a change, report a problem or ask a question. We usually reply within a working day.</p>
      <h2 className="mt-8 font-display text-lg font-semibold">New request</h2>
      <div className="mt-3"><NewTicket projects={projects} amc={amc} initialProject={projects.some((p) => p.id === searchParams.project) ? String(searchParams.project) : ""}
        {...(renewPlan ? { initialKind: "renewal", initialSubject: `Please renew my ${renewPlan.title}`, initialMessage: `Hi, please renew my ${renewPlan.title} (ends ${shortDate(renewPlan.endDate)}) for one more year and send the invoice.` } : {})} /></div>
      <h2 className="mt-8 font-display text-lg font-semibold">Your requests</h2>
      {tickets.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line bg-white p-6 text-sm text-muted">No requests yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-white">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/portal/support?t=${t.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-mist">
                <MessageSquare size={17} className="shrink-0 text-lav-700" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{t.subject}{t.clientUnread && <span className="ml-2 rounded-full bg-lav-600 px-2 py-0.5 text-[10px] font-bold text-white">New reply</span>}</span>
                  <span className="block text-xs text-muted">{ticketKindLabel[t.kind]}{t.urgent ? " · Urgent" : ""} · {t.messages.length} message{t.messages.length > 1 ? "s" : ""} · updated {shortDate(t.updatedAt)}</span>
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone[t.status]}`}>{ticketStatusLabel[t.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
