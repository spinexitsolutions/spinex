import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle, CircleDot, ExternalLink, FileText, LifeBuoy } from "lucide-react";
import { getClientSession } from "@/lib/client-auth";
import { clientBills } from "@/lib/portal-billing";
import { listPortalFiles, ticketsCol } from "@/lib/portal-db";
import { currentStage, projectProgress, projectStatusLabel, shortDate, type PortalProject } from "@/lib/portal";
import { inr } from "@/lib/billing";

export default async function PortalHome() {
  const client = await getClientSession();
  if (!client) redirect("/portal/login");
  const [bills, files, openTickets] = await Promise.all([
    clientBills(client),
    listPortalFiles(client.id),
    (await ticketsCol()).countDocuments({ clientId: client.id, status: { $ne: "closed" } }),
  ]);
  const due = bills.reduce((s, b) => s + b.balance, 0);
  const order = { active: 0, "on-hold": 1, completed: 2 } as const;
  const projects = [...client.projects].sort((a, b) => order[a.status] - order[b.status]);
  const active = projects.filter((p) => p.status !== "completed").length;

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-muted">Welcome back</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{client.company || client.name}</h1>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Card label="Active projects" value={String(active)} sub={projects.length ? `${projects.length} in total` : "No projects yet"} />
        <Card label="Amount due" value={inr(due, 0)} sub={due > 0 ? "See invoices to pay" : "Nothing due"} href="/portal/invoices" accent={due > 0} />
        <Card label="Open support requests" value={String(openTickets)} sub="Ask us anything" href="/portal/support" />
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-[24px] border border-dashed border-line bg-white p-10 text-center text-muted">Your projects will show here once our team adds them.</div>
      ) : (
        <div className="mt-8 space-y-6">
          {projects.map((p) => <ProjectCard key={p.id} p={p} files={files.filter((f) => f.projectId === p.id).length} />)}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-8 rounded-[24px] border border-line bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent files</h2>
            <Link href="/portal/files" className="text-sm font-semibold text-lav-700 hover:underline">All files</Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {files.slice(0, 4).map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5 text-sm">
                <FileText size={16} className="shrink-0 text-muted" />
                <a href={`/api/portal/files/${f.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{f.name}</a>
                <span className="shrink-0 text-xs text-muted">{shortDate(f.uploadedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, sub, href, accent = false }: { label: string; value: string; sub: string; href?: string; accent?: boolean }) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold tracking-tight ${accent ? "text-lav-700" : ""}`}>{value}</p>
      <p className="mt-1 flex items-center gap-1 text-sm text-muted">{sub}{href && <ArrowUpRight size={14} />}</p>
    </>
  );
  return href ? <Link href={href} className="rounded-[24px] border border-line bg-white p-6 transition hover:border-lav-300">{body}</Link> : <div className="rounded-[24px] border border-line bg-white p-6">{body}</div>;
}

function ProjectCard({ p, files }: { p: PortalProject; files: number }) {
  const progress = projectProgress(p);
  const stage = currentStage(p);
  const badge = p.status === "completed" ? "bg-emerald-50 text-emerald-800" : p.status === "on-hold" ? "bg-amber-50 text-amber-800" : "bg-lav-100 text-lav-700";
  return (
    <section className="rounded-[28px] border border-line bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {p.type && <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{p.type}</p>}
          <h2 className="font-display text-2xl font-semibold tracking-tight">{p.title || "Project"}</h2>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${badge}`}>{projectStatusLabel[p.status]}</span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span><b>{progress}%</b>{stage && p.status !== "completed" ? <span className="text-muted"> · {stage.title}</span> : null}</span>
          <span className="text-muted">{[p.startDate && `Started ${shortDate(p.startDate)}`, p.dueDate && p.status !== "completed" && `Target ${shortDate(p.dueDate)}`].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-lav-600" style={{ width: `${progress}%` }} /></div>
      </div>

      {p.stages.length > 0 && (
        <ol className="mt-6 grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
          {p.stages.map((st) => (
            <li key={st.id} className={`rounded-2xl px-4 py-3 ${st.status === "current" ? "bg-lav-100" : "bg-mist"}`}>
              <p className="flex items-center gap-2 text-sm font-semibold">
                {st.status === "done" ? <CheckCircle2 size={16} className="text-emerald-600" /> : st.status === "current" ? <CircleDot size={16} className="text-lav-700" /> : <Circle size={16} className="text-muted" />}
                {st.title}
              </p>
              <p className="mt-0.5 pl-6 text-xs text-muted">{st.status === "done" ? (st.date ? `Done ${shortDate(st.date)}` : "Done") : st.status === "current" ? "In progress" : st.date ? `Planned ${shortDate(st.date)}` : "Coming up"}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h3 className="font-semibold">Latest updates</h3>
          {p.updates.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Updates from our team will appear here.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {[...p.updates].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6).map((u) => (
                <li key={u.id} className="border-l-2 border-lav-300 pl-4">
                  <p className="text-xs text-muted">{shortDate(u.at)}{u.by ? ` · ${u.by}` : ""}</p>
                  <p className="whitespace-pre-line text-sm">{u.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-4">
          {p.nextStep && (
            <div className="rounded-2xl bg-ink p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lav-300">Next step</p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-white/85">{p.nextStep}</p>
            </div>
          )}
          {p.links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {p.links.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="btn-ghost bg-white px-4 py-2 text-sm"><ExternalLink size={14} /> {l.label || "Open link"}</a>)}
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/portal/files" className="inline-flex items-center gap-1.5 font-semibold text-lav-700 hover:underline"><FileText size={15} /> {files ? `${files} file${files > 1 ? "s" : ""}` : "Files"}</Link>
            <span className="text-line">|</span>
            <Link href={`/portal/support?new=1&project=${p.id}`} className="inline-flex items-center gap-1.5 font-semibold text-lav-700 hover:underline"><LifeBuoy size={15} /> Ask about this project</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
