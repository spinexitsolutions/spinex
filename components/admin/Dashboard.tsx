"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BellRing, FileText, GraduationCap, Image as ImageIcon, Inbox, IndianRupee, Loader2, TrendingUp, Award, Briefcase } from "lucide-react";
import { leadStatusLabel, LEAD_SOURCES, type LeadStatus } from "@/lib/leads";
import { statusLabel, type Status } from "@/lib/interns";

type Stats = {
  months: string[];
  leads?: {
    total: number; newThisWeek: number; byStatus: Record<string, number>; bySource: Record<string, number>;
    perMonth: { all: number; won: number }[]; wonValue: number; followUpsDue: number; topServices: [string, number][];
    latest: { id: string; name: string; status: LeadStatus; source: string; createdAt: string }[];
  };
  people?: { interns: number; jobApplicants: number; byStatus: Record<string, number>; certificates: number; perMonth: number[] };
  content?: { published: number; drafts: number; images: number };
};

const PALETTE = ["#6E59D9", "#A595FB", "#120F1B", "#34C78C", "#FFBD2E", "#FF7896", "#C2B6FF"];

export default function Dashboard({ go, name }: { go: (s: string) => void; name: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Couldn't load the dashboard.");
        setStats(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (error) return <p className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">{error}</p>;
  if (!stats) return <div className="grid place-items-center rounded-3xl border border-line bg-white p-16 text-muted"><Loader2 className="animate-spin" /></div>;

  const { leads, people, content, months } = stats;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">{greet}, {name.split(" ")[0]}.</h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {leads && <Kpi Icon={Inbox} label="New leads this week" value={leads.newThisWeek} onClick={() => go("leads")} />}
        {leads && <Kpi Icon={BellRing} label="Follow-ups due" value={leads.followUpsDue} tone={leads.followUpsDue ? "red" : undefined} onClick={() => go("leads")} />}
        {leads && <Kpi Icon={IndianRupee} label="Won so far" value={`₹${leads.wonValue.toLocaleString("en-IN")}`} />}
        {leads && <Kpi Icon={TrendingUp} label="Win rate" value={`${leads.total ? Math.round(((leads.byStatus.won ?? 0) / leads.total) * 100) : 0}%`} />}
        {people && <Kpi Icon={GraduationCap} label="Interns" value={people.interns} onClick={() => go("interns")} />}
        {people && <Kpi Icon={Briefcase} label="Job applicants" value={people.jobApplicants} onClick={() => go("interns")} />}
        {people && <Kpi Icon={Award} label="Certificates issued" value={people.certificates} onClick={() => go("certificates")} />}
        {content && <Kpi Icon={FileText} label="Blog posts live" value={content.published} onClick={() => go("blog")} />}
        {content && <Kpi Icon={ImageIcon} label="Images in media" value={content.images} onClick={() => go("media")} />}
      </div>

      {leads && (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card title="Leads per month" note="Last 6 months. The darker part of each bar is leads you won.">
            <Bars labels={months} series={leads.perMonth.map((m) => [m.all, m.won])} />
          </Card>
          <Card title="Lead status">
            <Donut data={Object.entries(leads.byStatus).map(([k, v]) => [leadStatusLabel[k as LeadStatus] ?? k, v])} />
          </Card>
        </div>
      )}

      {leads && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Where leads come from">
            <HBars data={Object.entries(leads.bySource).map(([k, v]) => [LEAD_SOURCES[k as keyof typeof LEAD_SOURCES] ?? k, v])} />
          </Card>
          <Card title="Most asked services">
            {leads.topServices.length ? <HBars data={leads.topServices} /> : <Empty />}
          </Card>
          <Card title="Latest leads">
            {leads.latest.length ? (
              <ul className="divide-y divide-line">
                {leads.latest.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{l.name}</span>
                      <span className="text-xs text-muted">{new Date(l.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    </span>
                    <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs">{leadStatusLabel[l.status] ?? l.status}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty />}
          </Card>
        </div>
      )}

      {people && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Applications per month" note="Interns and job applicants together.">
            <Bars labels={months} series={people.perMonth.map((n) => [n, 0])} />
          </Card>
          <Card title="Interns by status">
            <Donut data={Object.entries(people.byStatus).map(([k, v]) => [statusLabel[k as Status] ?? k, v])} />
          </Card>
        </div>
      )}
    </div>
  );
}

function Kpi({ Icon, label, value, tone, onClick }: { Icon: typeof Inbox; label: string; value: number | string; tone?: "red"; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`rounded-2xl border p-4 text-left transition-colors ${tone === "red" ? "border-red-200 bg-red-50" : "border-line bg-white"} ${onClick ? "hover:border-ink" : ""}`}>
      <Icon size={18} className={tone === "red" ? "text-red-600" : "text-lav-600"} />
      <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </Tag>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const Empty = () => <p className="py-8 text-center text-sm text-muted">No data yet.</p>;

// Vertical bars; each item is [total, highlighted part].
function Bars({ labels, series }: { labels: string[]; series: [number, number][] }) {
  const max = Math.max(1, ...series.map((s) => s[0]));
  if (series.every((s) => s[0] === 0)) return <Empty />;
  return (
    <div className="flex h-56 items-end gap-3">
      {series.map(([all, part], i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="text-xs font-semibold">{all}</span>
          <div className="relative w-full max-w-[56px] overflow-hidden rounded-t-xl bg-lav-200" style={{ height: `${(all / max) * 100}%`, minHeight: all ? 6 : 2 }}>
            <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.7, delay: i * 0.05 }} className="absolute inset-0 origin-bottom bg-lav-400" />
            {part > 0 && <motion.div initial={{ height: 0 }} animate={{ height: `${(part / all) * 100}%` }} transition={{ duration: 0.7, delay: 0.3 + i * 0.05 }} className="absolute inset-x-0 bottom-0 bg-lav-700" />}
          </div>
          <span className="text-xs text-muted">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function HBars({ data }: { data: [string, number][] }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  if (!data.length) return <Empty />;
  return (
    <ul className="space-y-3">
      {data.map(([label, n], i) => (
        <li key={label}>
          <div className="mb-1 flex justify-between text-sm"><span className="truncate pr-2">{label}</span><span className="font-semibold">{n}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-mist">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(n / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.06 }} className="h-full rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Donut({ data }: { data: [string, number][] }) {
  const total = data.reduce((n, d) => n + d[1], 0);
  if (!total) return <Empty />;
  const r = 60, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90" aria-hidden>
        <circle cx="80" cy="80" r={r} fill="none" stroke="#F5F3FA" strokeWidth="22" />
        {data.map(([label, n], i) => {
          const len = (n / total) * c;
          const el = <circle key={label} cx="80" cy="80" r={r} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="22" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {data.map(([label, n], i) => (
          <li key={label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            {label} <span className="font-semibold">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
