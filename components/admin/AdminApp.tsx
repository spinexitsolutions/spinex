"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Type, Info, Layers, Briefcase, Building2, Quote, Film, Phone, Bot, DatabaseBackup,
  LogOut, ExternalLink, Plug, UserCog, Image as ImageIcon, Images, Search, Newspaper, LayoutTemplate, PanelTop, ListOrdered, Target, CalendarClock, Package, KeyRound, Palette, History, GraduationCap, Check, Download, Upload, RotateCcw, Menu, X, Users, Award, Loader2, Inbox,
} from "lucide-react";
import { useContent } from "../ContentProvider";
import { defaultContent, mergeContent, LATER_SERVICES, PROJECT_DISPLAYS, type SiteContent } from "@/lib/content";
import { ListEditor, ObjectEditor, uid } from "./fields";
import InternsManager from "./InternsManager";
import LeadsManager from "./LeadsManager";
import MediaLibrary, { MediaDeleteContext } from "./MediaLibrary";
import PostsManager from "./PostsManager";
import HomeLayoutEditor from "./HomeLayoutEditor";
import PlannerEditor from "./PlannerEditor";
import HistoryPanel from "./HistoryPanel";
import Dashboard from "./Dashboard";
import UsersManager from "./UsersManager";
import ApiKeysManager from "./ApiKeysManager";
import ThemeEditor from "./ThemeEditor";
import { can, roleLabel, type Perm, type Role } from "@/lib/roles";
import type { Lead } from "@/lib/leads";

const sections = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard, group: "" , perm: "stats" },
  { id: "leads", label: "Leads", Icon: Inbox, group: "Inbox" , perm: "leads" },
  { id: "interns", label: "Interns", Icon: Users, group: "Inbox" , perm: "people" },
  { id: "certificates", label: "Certificates", Icon: Award, group: "Inbox" , perm: "people" },
  { id: "careers", label: "Careers (jobs)", Icon: Briefcase, group: "Content" , perm: "content" },
  { id: "blog", label: "Blog posts", Icon: Newspaper, group: "Content" , perm: "content" },
  { id: "home", label: "Home page", Icon: LayoutTemplate, group: "Content" , perm: "content" },
  { id: "hero", label: "Brand and hero", Icon: Type, group: "Content" , perm: "content" },
  { id: "pages", label: "Page headers", Icon: PanelTop, group: "Content" , perm: "content" },
  { id: "services", label: "Services", Icon: Layers, group: "Content" , perm: "content" },
  { id: "products", label: "Products", Icon: Package, group: "Content" , perm: "content" },
  { id: "projects", label: "Projects", Icon: Briefcase, group: "Content" , perm: "content" },
  { id: "process", label: "Process steps", Icon: ListOrdered, group: "Content" , perm: "content" },
  { id: "industries", label: "Industries", Icon: Building2, group: "Content" , perm: "content" },
  { id: "goals", label: "Goal picker", Icon: Target, group: "Content" , perm: "content" },
  { id: "planner", label: "Project planner", Icon: CalendarClock, group: "Content" , perm: "content" },
  { id: "about", label: "About and stats", Icon: Info, group: "Content" , perm: "content" },
  { id: "testimonials", label: "Testimonials", Icon: Quote, group: "Content" , perm: "content" },
  { id: "internship", label: "Internship", Icon: GraduationCap, group: "Content" , perm: "content" },
  { id: "showreel", label: "Showreel video", Icon: Film, group: "Content" , perm: "content" },
  { id: "chatbot", label: "Chatbot and FAQ", Icon: Bot, group: "Content" , perm: "content" },
  { id: "theme", label: "Colour theme", Icon: Palette, group: "Files and settings" , perm: "content" },
  { id: "media", label: "Media", Icon: Images, group: "Files and settings" , perm: "content" },
  { id: "banners", label: "Page banners", Icon: ImageIcon, group: "Files and settings" , perm: "content" },
  { id: "seo", label: "SEO", Icon: Search, group: "Files and settings" , perm: "content" },
  { id: "contact", label: "Contact details", Icon: Phone, group: "Files and settings" , perm: "content" },
  { id: "history", label: "History", Icon: History, group: "Files and settings" , perm: "content" },
  { id: "integrations", label: "WhatsApp and analytics", Icon: Plug, group: "Files and settings" , perm: "content" },
  { id: "backup", label: "Backup and restore", Icon: DatabaseBackup, group: "Files and settings" , perm: "content" },
  { id: "apikeys", label: "API keys", Icon: KeyRound, group: "Files and settings" , perm: "users" },
  { id: "team", label: "Team and roles", Icon: UserCog, group: "Files and settings" , perm: "users" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export default function AdminApp() {
  return <AdminShell />;
}

function AdminShell() {
  const { content, update } = useContent();
  const [saving, setSaving] = useState(false);
  const [newLeads, setNewLeads] = useState(0);

  // Unread enquiries count for the sidebar badge
  useEffect(() => {
    fetch("/api/admin/leads")
      .then((r) => (r.ok ? r.json() : []))
      .then((all: Lead[]) => setNewLeads(Array.isArray(all) ? all.filter((l) => l.status === "new").length : 0))
      .catch(() => undefined);
  }, []);
  const [draft, setDraft] = useState<SiteContent>(content);
  const [section, setSection] = useState<SectionId>("overview");
  const [me, setMe] = useState<{ email: string; name: string; role: Role } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) {
          window.location.href = "/admin/login";
          return;
        }
        setMe(d);
        // Land on the first section this role can open
        if (!can(d.role, "stats")) setSection("leads");
      })
      .catch(() => undefined);
  }, []);
  const allowed = sections.filter((x) => !me || can(me.role, x.perm as Perm));
  const [toast, setToast] = useState("");
  const [nav, setNav] = useState(false);
  const [conflict, setConflict] = useState("");
  // True when the latest saved content couldn't be fetched, so the save base is unknown.
  const [loadFailed, setLoadFailed] = useState(false);
  const [certSaving, setCertSaving] = useState(false);
  const [postDirty, setPostDirty] = useState(false);
  // Last x-content-updated seen from the server; sent back on save so edits by someone else aren't overwritten.
  const baseUpdated = useRef<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(content);
  const certDirty = JSON.stringify(draft.certificate) !== JSON.stringify(content.certificate);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // When content changes, keep unsaved edits in parts that weren't changed by the new content.
  const prevContent = useRef(content);
  useEffect(() => {
    const prev = prevContent.current;
    prevContent.current = content;
    if (prev === content) return;
    setDraft((d) => {
      const next = { ...content } as Record<string, unknown>;
      const dr = d as unknown as Record<string, unknown>;
      const pr = prev as unknown as Record<string, unknown>;
      for (const k of Object.keys(dr)) if (JSON.stringify(dr[k]) !== JSON.stringify(pr[k])) next[k] = dr[k];
      return next as unknown as SiteContent;
    });
  }, [content]);

  // Fetches the latest saved content. Unsaved edits are kept unless `replace` is true.
  const loadContent = async (replace: boolean) => {
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return false;
      }
      if (!res.ok) {
        if (baseUpdated.current === null) setLoadFailed(true);
        return false;
      }
      const data = (await res.json()) as SiteContent;
      if (!replace && dirtyRef.current) {
        // Edits were made before this load finished. Safe only if the saved content is what the edits started from.
        if (JSON.stringify(data) === JSON.stringify(prevContent.current)) {
          baseUpdated.current = res.headers.get("x-content-updated") ?? "";
          setLoadFailed(false);
        } else setConflict("The saved website content changed after this page opened. Reload to get the latest version before saving.");
        return false;
      }
      baseUpdated.current = res.headers.get("x-content-updated") ?? "";
      setLoadFailed(false);
      update(data);
      setDraft(data);
      return true;
    } catch {
      if (baseUpdated.current === null) setLoadFailed(true);
      return false;
    }
  };
  useEffect(() => {
    if (me && can(me.role, "content")) loadContent(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);
  const reload = async () => {
    if (dirty && !confirm("Load the latest saved content? Your unsaved changes will be lost.")) return;
    if (await loadContent(true)) {
      setConflict("");
      flash("Latest content loaded");
    } else flash("Couldn't load the latest content. Try again.");
  };

  // Switches sidebar section, asking first if a blog post has unsaved changes.
  const go = (id: SectionId) => {
    if (id === section) return;
    if (section === "blog" && postDirty && !confirm("You have unsaved changes in this post. Leave without saving?")) return;
    setPostDirty(false);
    setSection(id);
  };
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  // Saves to the database; the public site updates straight away.
  const saveContent = async (next: SiteContent, done: string, replace = false) => {
    setSaving(true);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      // Always send a base so the server can check: "unknown" if we never got one, "none" if nothing was saved yet.
      headers["x-base-updated"] = baseUpdated.current === null ? "unknown" : baseUpdated.current || "none";
      const res = await fetch("/api/admin/content", { method: "PUT", headers, body: JSON.stringify(next) });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 || data.conflict) {
        // Someone else saved first. Keep this draft; the user decides whether to reload.
        const msg = data.error || "Someone else saved the content after you opened it. Reload to get their changes.";
        setConflict(msg);
        flash("Not saved: content changed elsewhere");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Couldn't save. Try again.");
      baseUpdated.current = res.headers.get("x-content-updated") ?? baseUpdated.current;
      setConflict("");
      update(data);
      // Import and reset replace everything. A normal save keeps any part edited while it was in progress.
      if (replace) {
        setDraft(data as SiteContent);
        flash(done);
        return;
      }
      setDraft((d) => {
        const out = { ...(data as SiteContent) } as Record<string, unknown>;
        const dr = d as unknown as Record<string, unknown>;
        const sent = next as unknown as Record<string, unknown>;
        for (const k of Object.keys(dr)) if (JSON.stringify(dr[k]) !== JSON.stringify(sent[k])) out[k] = dr[k];
        return out as unknown as SiteContent;
      });
      flash(done);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };
  const save = () => saveContent(draft, "Saved. Changes are live on the website.");
  // Certificate design and signers save on their own, so HR can save them too.
  const saveCertificate = async () => {
    setCertSaving(true);
    const sent = draft.certificate;
    try {
      // "none" = nothing was saved yet when we loaded (same as the content save).
      const base: Record<string, string> = baseUpdated.current === null ? {} : { "x-base-updated": baseUpdated.current || "none" };
      const res = await fetch("/api/admin/content/certificate", { method: "PUT", headers: { "content-type": "application/json", ...base }, body: JSON.stringify({ certificate: sent }) });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.certificate) throw new Error(data.error || "Couldn't save the certificate. Try again.");
      const certificate = data.certificate as SiteContent["certificate"];
      // Move our base forward only if nobody else had saved since we loaded; otherwise keep it,
      // so our next content save still warns about their newer changes.
      if (res.headers.get("x-base-current") === "1") baseUpdated.current = res.headers.get("x-content-updated") ?? baseUpdated.current;
      update({ ...content, certificate });
      // Keep certificate edits made while the save was in progress.
      setDraft((d) => (JSON.stringify(d.certificate) !== JSON.stringify(sent) ? d : { ...d, certificate }));
      flash("Certificate saved");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't save the certificate. Try again.");
    } finally {
      setCertSaving(false);
    }
  };
  const canCert = !!me && (can(me.role, "people") || can(me.role, "content"));
  // The server ignores integration changes from anyone but the owner or an admin.
  const canIntegrations = !!me && (me.role === "owner" || me.role === "admin");
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };
  const contentSection = !(["overview", "interns", "leads", "certificates", "media", "blog", "history", "team", "apikeys"] as string[]).includes(section) && (!me || can(me.role, "content"));
  const set = <K extends keyof SiteContent>(k: K, v: SiteContent[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const current = sections.find((s) => s.id === section)!;

  return (
    <MediaDeleteContext.Provider value={!!me && can(me.role, "content")}>
    <div className="min-h-screen bg-mist lg:flex">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col bg-ink p-5 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${nav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2 pb-8 pt-2">
          <div className="flex items-center gap-2.5">
            {draft.brand.logo && <img src={draft.brand.logo} alt="" className="h-11 w-11 object-contain" />}
            <div>
              <p className="font-display font-semibold leading-tight">Spinex</p>
              <p className="text-xs text-white/55">Admin panel</p>
            </div>
          </div>
          <button onClick={() => setNav(false)} className="lg:hidden" aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav className="-mx-1 flex-1 space-y-0.5 overflow-y-auto px-1 [scrollbar-width:thin]" aria-label="Admin sections">
          {allowed.map(({ id, label, Icon, group }, i) => (
            <div key={id}>
            {group && group !== allowed[i - 1]?.group && <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-white/35">{group}</p>}
            <button onClick={() => { go(id); setNav(false); }} className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14.5px]">
              {section === id && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-white/10" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <Icon size={17} className={`relative ${section === id ? "text-lav-300" : "text-white/50"}`} />
              <span className={`relative flex-1 ${section === id ? "text-white" : "text-white/70"}`}>{label}</span>
              {id === "leads" && newLeads > 0 && <span className="relative rounded-full bg-lav-500 px-2 py-0.5 text-xs font-bold text-white">{newLeads}</span>}
            </button>
            </div>
          ))}
        </nav>
        {me && (
          <div className="mt-4 rounded-xl bg-white/5 px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{me.name}</p>
            <p className="truncate text-xs text-white/55">{roleLabel[me.role]} · {me.email}</p>
          </div>
        )}
        <button onClick={logout} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/60 hover:bg-white/10 hover:text-white">
          <LogOut size={17} /> Log out
        </button>
      </aside>
      {nav && <div className="fixed inset-0 z-30 bg-ink/50 lg:hidden" onClick={() => setNav(false)} />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/90 px-5 py-4 backdrop-blur sm:px-8">
          <button onClick={() => setNav(true)} className="lg:hidden" aria-label="Open menu"><Menu size={22} /></button>
          <h1 className="flex-1 font-display text-xl font-semibold">{current.label}</h1>
          <Link href="/" target="_blank" className="hidden items-center gap-2 text-sm text-muted hover:text-ink sm:flex"><ExternalLink size={15} /> View site</Link>
          {contentSection && dirty && <button onClick={() => setDraft(content)} className="btn-ghost px-4 py-2 text-sm">Discard</button>}
          {contentSection && <button onClick={save} disabled={!dirty || saving} className="btn-dark px-5 py-2.5 text-sm disabled:cursor-default disabled:bg-line disabled:text-muted">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving</> : dirty ? "Save changes" : "All saved"}
          </button>}
          {section === "certificates" && canCert && certDirty && <button onClick={() => setDraft((d) => ({ ...d, certificate: content.certificate }))} className="btn-ghost px-4 py-2 text-sm">Discard</button>}
          {section === "certificates" && canCert && <button onClick={saveCertificate} disabled={!certDirty || certSaving} className="btn-dark px-5 py-2.5 text-sm disabled:cursor-default disabled:bg-line disabled:text-muted">
            {certSaving ? <><Loader2 size={15} className="animate-spin" /> Saving</> : certDirty ? "Save certificate" : "All saved"}
          </button>}
        </header>

        <main className="mx-auto max-w-4xl p-5 sm:p-8">
          {loadFailed && !conflict && (
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
              <p className="min-w-[200px] flex-1">Couldn&apos;t load the latest saved content. Reload before saving.</p>
              <button onClick={reload} className="btn-ghost bg-white px-4 py-2 text-sm"><RotateCcw size={15} /> Reload</button>
            </div>
          )}
          {conflict && (
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
              <p className="min-w-[200px] flex-1"><span className="font-semibold">Not saved.</span> {conflict} Your changes are still here.</p>
              <button onClick={reload} className="btn-ghost bg-white px-4 py-2 text-sm"><RotateCcw size={15} /> Reload</button>
              <button onClick={() => setConflict("")} aria-label="Dismiss" className="grid h-9 w-9 place-items-center rounded-full hover:bg-amber-100"><X size={16} /></button>
            </div>
          )}
          <motion.div key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {section === "overview" && <Dashboard go={(id) => go(id as SectionId)} name={me?.name ?? "there"} />}

            {section === "team" && <UsersManager />}

            {section === "apikeys" && <ApiKeysManager />}

            {section === "theme" && <ThemeEditor value={draft.theme} onChange={(v) => set("theme", v)} />}

            {section === "leads" && <LeadsManager onNewCount={setNewLeads} />}

            {section === "interns" && <InternsManager mode="interns" />}

            {section === "media" && <MediaLibrary />}

            {section === "certificates" && (
              <div className="space-y-6">
                <Card title="Certificate design" note="Use {name}, {role}, {company}, {start} and {end} in the text. Press Save certificate to apply them.">
                  <ObjectEditor value={draft.certificate} onChange={(v) => set("certificate", v)} fields={[
                    { key: "title", label: "Title" },
                    { key: "body", label: "Main text", type: "textarea" },
                    { key: "verifyUrl", label: "Verification address", hint: "Printed on the certificate and used by the QR code" },
                  ]} />
                </Card>
                <Card title="Signatures" note="Up to 3 people sign each certificate, shown left to right in this order. Signature images look best as transparent PNGs.">
                  <ListEditor items={draft.certificate.signers ?? []} titleKey="name" addLabel="Add signer" max={3} maxNote="Up to 3 signers"
                    onChange={(v) => set("certificate", { ...draft.certificate, signers: v.slice(0, 3) })}
                    newItem={() => ({ id: uid(), name: "", title: "", image: "" })}
                    fields={[{ key: "name", label: "Name" }, { key: "title", label: "Designation" }, { key: "image", label: "Signature image", type: "image", hint: "Optional" }]} />
                </Card>
                <InternsManager mode="certificates" />
              </div>
            )}

            {section === "hero" && (
              <div className="space-y-6">
                <Card title="Brand">
                  <ObjectEditor value={draft.brand} onChange={(v) => set("brand", v)} fields={[
                    { key: "name", label: "Company name" },
                    { key: "tagline", label: "Tagline", hint: "Shown in the footer" },
                    { key: "logo", label: "Logo", type: "image", hint: "Used in navbar and footer only" },
                  ]} />
                </Card>
                <Card title="Homepage hero">
                  <ObjectEditor value={draft.hero} onChange={(v) => set("hero", v)} fields={[
                    { key: "kicker", label: "Keyword line (part of the H1)", hint: "Small line above the headline, e.g. Website development company in Jaipur" },
                    { key: "title", label: "Headline", type: "textarea" },
                    { key: "subtitle", label: "Supporting text", type: "textarea" },
                    { key: "primaryCta", label: "Main button" },
                    { key: "secondaryCta", label: "Second button" },
                  ]} />
                </Card>
              </div>
            )}

            {section === "blog" && <PostsManager onDirtyChange={setPostDirty} />}

            {section === "home" && (
              <div className="space-y-6">
                <Card title="Sections on the home page" note="Turn sections on or off and change their order. Save changes to apply.">
                  <HomeLayoutEditor value={draft.homeLayout} onChange={(v) => set("homeLayout", v)} />
                </Card>
                <Card title="Section headings" note="The big heading and short line for each home page section.">
                  <div className="space-y-6">
                    {([
                      ["services", "Services"], ["why", "Why Spinex"], ["process", "Process"], ["work", "Projects"], ["industries", "Who we work with"],
                      ["goals", "Goal picker (small line above the sentence)"], ["planner", "Project planner"], ["blog", "Latest articles"], ["faq", "FAQ"], ["contact", "Contact section"],
                    ] as const).map(([key, label]) => (
                      <div key={key} className="rounded-2xl border border-line p-4">
                        <p className="mb-3 text-sm font-semibold text-lav-700">{label}</p>
                        <ObjectEditor value={draft.sections[key]} onChange={(v) => set("sections", { ...draft.sections, [key]: v })} fields={[
                          { key: "heading", label: "Heading" },
                          { key: "intro", label: "Short line" },
                        ]} />
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Tools strip" note="The moving line of tool names under the hero.">
                  <ObjectEditor value={{ tools: draft.sections.tools }} onChange={(v) => set("sections", { ...draft.sections, tools: v.tools })} fields={[{ key: "tools", label: "Tools", type: "tags" }]} />
                </Card>
              </div>
            )}

            {section === "pages" && (
              <div className="space-y-6">
                {([["about", "About"], ["services", "Services"], ["products", "Products"], ["work", "Work"], ["contact", "Contact"], ["internship", "Internship"], ["blog", "Blog"], ["careers", "Careers"]] as const).map(([key, label]) => (
                  <Card key={key} title={`${label} page`}>
                    <ObjectEditor value={draft.pages[key]} onChange={(v) => set("pages", { ...draft.pages, [key]: v })} fields={[
                      { key: "title", label: "Heading" },
                      { key: "intro", label: "Intro text", type: "textarea" },
                    ]} />
                  </Card>
                ))}
              </div>
            )}

            {section === "process" && (
              <>
                <p className="mb-4 text-sm text-muted">The stages shown in the home page Process section, in order. Each step keeps its picture by position.</p>
                <ListEditor items={draft.process} titleKey="title" addLabel="Add step" onChange={(v) => set("process", v)}
                  newItem={() => ({ id: uid(), title: "", time: "", text: "", gets: [] })}
                  fields={[{ key: "title", label: "Name" }, { key: "time", label: "Time", hint: "e.g. 3–5 days" }, { key: "text", label: "Description", type: "textarea" }, { key: "gets", label: "What the client gets", type: "lines" }]} />
              </>
            )}

            {section === "planner" && (
              <>
                <p className="mb-6 text-sm text-muted">Controls the &quot;{draft.sections.planner.heading}&quot; section on the home page. Heading and intro text are in Home page.</p>
                <PlannerEditor value={draft.planner} services={draft.services} onChange={(v) => set("planner", v)} />
              </>
            )}

            {section === "goals" && (
              <>
                <p className="mb-4 text-sm text-muted">Shown as &quot;I want to …&quot; on the home page. Service ids: {draft.services.map((s) => s.id).join(", ")}.</p>
                <ListEditor items={draft.goals} titleKey="short" addLabel="Add goal" onChange={(v) => set("goals", v)}
                  newItem={() => ({ id: uid(), short: "", label: "", steps: [], services: [] })}
                  fields={[{ key: "short", label: "Button text" }, { key: "label", label: "Sentence ending", hint: "after \"I want to\"" }, { key: "steps", label: "What we'd do", type: "lines" }, { key: "services", label: "Related service ids", type: "tags" }]} />
              </>
            )}

            {section === "careers" && (
              <div className="space-y-6">
                <Card title="Hiring">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={draft.careers.open} onChange={(e) => set("careers", { ...draft.careers, open: e.target.checked })} />
                    <span className="font-medium">Accepting job applications</span>
                  </label>
                  <div className="mt-6">
                    <ObjectEditor value={draft.careers} onChange={(v) => set("careers", v)} fields={[
                      { key: "intro", label: "Intro text", type: "textarea" },
                      { key: "perks", label: "Why work with us", type: "lines" },
                    ]} />
                  </div>
                </Card>
                <Card title="Open jobs" note="Applications arrive in Interns, under Job applicants.">
                  <ListEditor items={draft.careers.jobs} titleKey="title" addLabel="Add job" onChange={(v) => set("careers", { ...draft.careers, jobs: v })}
                    newItem={() => ({ id: uid(), title: "", type: "Full-time", location: "Jaipur (on-site)", experience: "", salary: "", description: "", requirements: [] })}
                    fields={[
                      { key: "title", label: "Job title" }, { key: "type", label: "Type", hint: "Full-time, part-time, contract" },
                      { key: "location", label: "Location" }, { key: "experience", label: "Experience", hint: "e.g. 1–3 years" },
                      { key: "salary", label: "Salary", hint: "optional, e.g. ₹15,000–25,000 / month" },
                      { key: "description", label: "What they'll do", type: "textarea" }, { key: "requirements", label: "Requirements", type: "lines" },
                    ]} />
                </Card>
              </div>
            )}

            {section === "integrations" && (
              <div className="space-y-6">
                {!canIntegrations && <p className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-muted">Only the owner or an admin can change these.</p>}
                <fieldset disabled={!canIntegrations} className="space-y-6 disabled:opacity-70">
                <Card title="Floating WhatsApp button" note="A green button on every page that opens WhatsApp chat with you.">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={draft.integrations.whatsappButton} onChange={(e) => set("integrations", { ...draft.integrations, whatsappButton: e.target.checked })} />
                    <span className="font-medium">Show the WhatsApp button</span>
                  </label>
                  <div className="mt-5">
                    <ObjectEditor value={draft.integrations} onChange={(v) => set("integrations", v)} fields={[{ key: "whatsappText", label: "Message filled in for the visitor", type: "textarea" }]} />
                  </div>
                  <p className="mt-3 text-sm text-muted">The number comes from Contact details.</p>
                </Card>
                <Card title="Cookie banner" note="Asks visitors to accept or reject cookies. While it is on, Google Analytics, Clarity, Meta Pixel and Tag Manager run only for visitors who press Accept. Visitors can change their choice from 'Cookie settings' in the footer.">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={!!draft.integrations.cookieBanner} onChange={(e) => set("integrations", { ...draft.integrations, cookieBanner: e.target.checked })} />
                    <span className="font-medium">Show the cookie banner</span>
                  </label>
                  <div className="mt-5">
                    <ObjectEditor value={draft.integrations} onChange={(v) => set("integrations", v)} fields={[{ key: "cookieText", label: "Banner text", type: "textarea", hint: "A link to the Privacy Policy is added after it" }]} />
                  </div>
                </Card>
                <Card title="Analytics" note="See how many people visit, which pages they open and where they leave. Leave empty to turn off.">
                  <ObjectEditor value={draft.integrations} onChange={(v) => set("integrations", v)} fields={[
                    { key: "gaId", label: "Google Analytics 4 ID", hint: "looks like G-XXXXXXXXXX" },
                    { key: "clarityId", label: "Microsoft Clarity project ID", hint: "10 letters, from clarity.microsoft.com" },
                    { key: "metaPixelId", label: "Meta (Facebook) Pixel ID", hint: "numbers only, from Meta Events Manager" },
                    { key: "gtmId", label: "Google Tag Manager ID", hint: "looks like GTM-XXXXXXX" },
                  ]} />
                </Card>
                </fieldset>
                {me && can(me.role, "users") && <p className="text-sm text-muted">API keys (email, AI chatbot, spam protection, webhooks) and custom code are in <button onClick={() => go("apikeys")} className="font-semibold text-lav-700 underline">API keys</button> (owner only).</p>}
              </div>
            )}

            {section === "history" && <HistoryPanel dirty={dirty} onRestored={(c, updated) => { if (updated !== null) baseUpdated.current = updated; setConflict(""); update(c); setDraft(c); flash("Older version restored and live"); }} />}

            {section === "seo" && (
              <div className="space-y-6">
                <Card title="Google search result" note="How the home page appears on Google. Keep the title under 60 characters and the description between 140 and 160.">
                  <div className="mb-6 rounded-2xl border border-line p-5">
                    <p className="text-xs text-muted">spinexwebsolutions.in</p>
                    <p className="mt-1 truncate text-lg text-[#1a0dab]">{draft.seo.metaTitle}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{draft.seo.metaDescription}</p>
                  </div>
                  <ObjectEditor value={draft.seo} onChange={(v) => set("seo", v)} fields={[
                    { key: "metaTitle", label: "Page title", hint: `${draft.seo.metaTitle.length} characters` },
                    { key: "metaDescription", label: "Description", type: "textarea", hint: `${draft.seo.metaDescription.length} characters` },
                    { key: "keywords", label: "Keywords", type: "tags" },
                  ]} />
                </Card>
                <Card title="Home page text for search" note="Shown on the home page above the FAQ. Leave an empty line between paragraphs.">
                  <ObjectEditor value={draft.seo} onChange={(v) => set("seo", v)} fields={[
                    { key: "heading", label: "Heading" },
                    { key: "text", label: "Text", type: "textarea" },
                    { key: "areas", label: "Cities you serve", type: "tags" },
                  ]} />
                </Card>
              </div>
            )}

            {section === "about" && (
              <div className="space-y-6">
                <Card title="About section">
                  <ObjectEditor value={draft.about} onChange={(v) => set("about", v)} fields={[
                    { key: "title", label: "Heading" },
                    { key: "body", label: "Main text", type: "textarea" },
                    { key: "philosophy", label: "Highlighted note", type: "textarea" },
                    { key: "image", label: "Image", type: "image" },
                  ]} />
                </Card>
                <Card title="Numbers">
                  <ListEditor items={draft.stats} titleKey="label" addLabel="Add number" onChange={(v) => set("stats", v)}
                    newItem={() => ({ id: uid(), value: "", label: "" })}
                    fields={[{ key: "value", label: "Value", hint: "Only real numbers, e.g. 50+ or 4.9★" }, { key: "label", label: "Label" }]} />
                </Card>
              </div>
            )}

            {section === "services" && (
              <ListEditor items={draft.services} titleKey="title" addLabel="Add service" onChange={(v) => {
                  const gone = LATER_SERVICES.filter((id) => draft.services.some((x) => x.id === id) && !v.some((x) => x.id === id));
                  setDraft((d) => ({ ...d, services: v, removedServices: Array.from(new Set([...(d.removedServices ?? []).filter((id) => !v.some((x) => x.id === id)), ...gone])) }));
                }}
                newItem={() => ({ id: uid(), title: "", short: "", description: "", tags: [], image: "", slug: "", seoTitle: "", seoDescription: "", body: "", features: [], faqs: "" })}
                fields={[
                  { key: "title", label: "Name" }, { key: "short", label: "One-line summary" },
                  { key: "description", label: "Description", type: "textarea" }, { key: "tags", label: "Highlights", type: "tags" },
                  { key: "image", label: "Image", type: "image" },
                  { key: "slug", label: "Page address", hint: "/services/… (e.g. website-development)" },
                  { key: "seoTitle", label: "Page title for Google", hint: "under 60 characters" },
                  { key: "seoDescription", label: "Description for Google", type: "textarea", hint: "140–160 characters" },
                  { key: "features", label: "What you get (page side box)", type: "lines" },
                  { key: "body", label: "Page text", type: "textarea", hint: "## for headings, - for lists, **bold**" },
                  { key: "faqs", label: "FAQs", type: "textarea", hint: "Question on one line, answer on the next, blank line between" },
                ]} />
            )}

            {section === "products" && (
              <>
                <p className="mb-4 text-sm text-muted">Your own software and SaaS. Each product gets its own page at /products/… with a &quot;Book a demo&quot; form; requests arrive in Leads as &quot;Product demo request&quot;. The Products link appears in the menu once you add the first product.</p>
                <ListEditor items={draft.products} titleKey="name" addLabel="Add product" onChange={(v) => set("products", v)}
                  newItem={() => ({ id: uid(), name: "", slug: "", tagline: "", description: "", category: "", audience: "", status: "Live", image: "", gallery: [], features: [], price: "", demoUrl: "", videoUrl: "", body: "", faqs: "", seoTitle: "", seoDescription: "" })}
                  fields={[
                    { key: "name", label: "Product name" },
                    { key: "slug", label: "Page address", hint: "/products/… e.g. waba-panel (leave empty to use the name)" },
                    { key: "tagline", label: "One-line pitch", hint: "e.g. Send WhatsApp campaigns to thousands in one click" },
                    { key: "status", label: "Status", type: "select", options: [{ value: "Live", label: "Live" }, { value: "Beta", label: "Beta" }, { value: "Coming soon", label: "Coming soon" }, { value: "", label: "Don't show" }] },
                    { key: "description", label: "Short description", type: "textarea", hint: "2–3 lines, shown on the card and to Google" },
                    { key: "category", label: "Category", hint: "e.g. WhatsApp marketing, CRM, Calling" },
                    { key: "audience", label: "Made for", hint: "e.g. Marketing agencies, Clinics" },
                    { key: "price", label: "Price", hint: "e.g. ₹2,999/month — empty shows \"Price on request\"" },
                    { key: "image", label: "Cover screenshot", type: "image" },
                    { key: "gallery", label: "More screenshots", type: "images" },
                    { key: "features", label: "Key features", type: "lines" },
                    { key: "demoUrl", label: "Live demo link", hint: "Optional" },
                    { key: "videoUrl", label: "YouTube video link", hint: "Optional, shown on the page" },
                    { key: "body", label: "Page text", type: "textarea", hint: "## for headings, - for lists, **bold**" },
                    { key: "faqs", label: "FAQs", type: "textarea", hint: "Question on one line, answer on the next, blank line between" },
                    { key: "seoTitle", label: "Page title for Google", hint: "under 60 characters" },
                    { key: "seoDescription", label: "Description for Google", type: "textarea", hint: "140–160 characters" },
                  ]} />
              </>
            )}

            {section === "projects" && (
              <>
              <p className="mb-4 text-sm text-muted">Projects show on the home page (first 6), the Work page, and on the matching service page. &quot;Show as&quot; picks the frame: website in a laptop, social media as an Instagram profile, video in a player, ads with results, design as a collage, e-commerce management as a seller dashboard, on-demand apps as customer app + admin + partner app. Fill only the fields that frame uses; the hint on each field says which.</p>
              <ListEditor items={draft.projects} titleKey="title" addLabel="Add project" onChange={(v) => set("projects", v)}
                newItem={() => ({ id: uid(), title: "", type: "client" as const, display: "" as const, category: "", summary: "", image: "", url: "" })}
                fields={[
                  { key: "title", label: "Project name" },
                  { key: "type", label: "Type", type: "select", hint: "Demo = made to show our skills, gets a \"Demo\" label", options: [{ value: "client", label: "Client project" }, { value: "demo", label: "Demo / concept" }] }, { key: "category", label: "Category", hint: `Filter tab. Use a service name to show it on that service page too: ${draft.services.map((x) => x.title).join(", ")}` },
                  { key: "display", label: "Show as", type: "select", hint: "Auto picks from the category", options: [{ value: "", label: "Auto (from category)" }, ...PROJECT_DISPLAYS] },
                  { key: "summary", label: "Short description", type: "textarea" }, { key: "url", label: "Live link", hint: "Optional" },
                  { key: "image", label: "Cover image", type: "image", hint: "All types. Also the video poster and the social profile photo" },
                  { key: "screen", label: "Full-page screenshot / dashboard", type: "image", hint: "Website: full-page desktop screenshot (scrolls in the laptop). E-commerce: seller dashboard. On-demand: admin panel. Use JPG under 4 MB" },
                  { key: "mobile", label: "Mobile screenshot", type: "image", hint: "Website: mobile view. On-demand: customer app" },
                  { key: "partner", label: "Partner app screenshot", type: "image", hint: "On-demand only" },
                  { key: "video", label: "Video link", hint: "Website or Video: YouTube link or .mp4 link. Plays muted on loop" },
                  { key: "videoShape", label: "Video shape", type: "select", options: [{ value: "wide", label: "Wide 16:9 (YouTube)" }, { value: "reel", label: "Reel 9:16 (Instagram / Shorts)" }] },
                  { key: "images", label: "More images", type: "images", hint: "Social: 6–9 posts · Design: 3–6 pieces · Ads: ad creative · E-commerce: product photos (same order as Products below)" },
                  { key: "results", label: "Results", type: "lines", hint: "Label: value, e.g. Leads per month: 40 → 180 (only real numbers)" },
                  { key: "handle", label: "Account / brand name", hint: "Social: @handle · Ads: advertiser name · E-commerce: store name" },
                  { key: "platforms", label: "Marketplaces", type: "tags", hint: "E-commerce: Amazon, Flipkart, Meesho, Shopify" },
                  { key: "items", label: "Products (e-commerce)", type: "lines", hint: "Name | price | note, e.g. Cotton saree | ₹1,299 | 312 sold" },
                  { key: "hidePage", label: "Case study page", type: "select", options: [{ value: "", label: "Show a case study page" }, { value: "hide", label: "No page (card only)" }] },
                  { key: "slug", label: "Page address", hint: "/work/… e.g. sharma-jewellers-website (empty = from the name)" },
                  { key: "client", label: "Client name", hint: "Leave empty if the client wants to stay private" },
                  { key: "industry", label: "Industry", hint: "e.g. Jewellery, Healthcare" },
                  { key: "year", label: "Year", hint: "e.g. 2026" },
                  { key: "duration", label: "Timeline", hint: "e.g. 6 weeks" },
                  { key: "services", label: "What we did", type: "tags", hint: "e.g. Website, SEO, Meta ads" },
                  { key: "challenge", label: "The challenge", type: "textarea", hint: "The client's problem before working with us. ## for headings, - for lists" },
                  { key: "solution", label: "What we did", type: "textarea", hint: "Our approach and the work, step by step" },
                  { key: "outcome", label: "The result", type: "textarea", hint: "What changed. Put the big numbers in Results above" },
                  { key: "quote", label: "Client's words", type: "textarea", hint: "A short real quote from the client (optional)" },
                  { key: "quoteBy", label: "Quote by", hint: "e.g. Rahul Sharma, Owner" },
                  { key: "seoTitle", label: "Page title for Google", hint: "under 60 characters (optional)" },
                  { key: "seoDescription", label: "Description for Google", type: "textarea", hint: "140–160 characters (optional)" },
                ]} />
              </>
            )}

            {section === "industries" && (
              <ListEditor items={draft.industries} titleKey="title" addLabel="Add industry" onChange={(v) => set("industries", v)}
                newItem={() => ({ id: uid(), title: "", description: "", image: "", points: [] })}
                fields={[
                  { key: "title", label: "Name" }, { key: "description", label: "Description" },
                  { key: "points", label: "Key points", type: "lines" }, { key: "image", label: "Image", type: "image" },
                ]} />
            )}

            {section === "testimonials" && (
              <>
                <p className="mb-4 text-sm text-muted">The testimonials section appears on the homepage once you add at least one. Use real client quotes only.</p>
                <ListEditor items={draft.testimonials} titleKey="name" addLabel="Add testimonial" onChange={(v) => set("testimonials", v)}
                  newItem={() => ({ id: uid(), name: "", role: "", quote: "" })}
                  fields={[{ key: "name", label: "Client name" }, { key: "role", label: "Role and company" }, { key: "quote", label: "Quote", type: "textarea" }]} />
              </>
            )}

            {section === "internship" && (
              <div className="space-y-6">
                <Card title="Applications">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={draft.internship.open} onChange={(e) => set("internship", { ...draft.internship, open: e.target.checked })} />
                    <span className="font-medium">Accepting applications</span>
                  </label>
                  <p className="mt-2 text-sm text-muted">Turn this off to hide the form and show a &quot;closed&quot; message.</p>
                  <div className="mt-6">
                    <ObjectEditor value={draft.internship} onChange={(v) => set("internship", v)} fields={[
                      { key: "intro", label: "Intro text", type: "textarea" },
                      { key: "perks", label: "What interns get", type: "lines" },
                      { key: "durations", label: "Duration options", type: "tags" },
                      { key: "modes", label: "Work mode options", type: "tags" },
                    ]} />
                  </div>
                </Card>
                <Card title="Open roles">
                  <ListEditor items={draft.internship.roles} titleKey="title" addLabel="Add role"
                    onChange={(v) => set("internship", { ...draft.internship, roles: v })}
                    newItem={() => ({ id: uid(), title: "", description: "", skills: [] })}
                    fields={[{ key: "title", label: "Role name" }, { key: "description", label: "What they'll do", type: "textarea" }, { key: "skills", label: "Skills needed", type: "lines" }]} />
                </Card>
              </div>
            )}

            {section === "banners" && (
              <Card title="Page banners" note="The large image at the top of each inner page.">
                <ObjectEditor value={draft.banners} onChange={(v) => set("banners", v)} fields={[
                  { key: "about", label: "About page", type: "image" },
                  { key: "services", label: "Services page", type: "image" },
                  { key: "products", label: "Products page", type: "image" },
                  { key: "work", label: "Work page", type: "image" },
                  { key: "contact", label: "Contact page", type: "image" },
                  { key: "internship", label: "Internship page", type: "image" },
                  { key: "blog", label: "Blog page", type: "image" },
                  { key: "careers", label: "Careers page", type: "image" },
                ]} />
              </Card>
            )}

            {section === "showreel" && (
              <Card title="Showreel">
                <ObjectEditor value={draft.showreel} onChange={(v) => set("showreel", v)} fields={[
                  { key: "title", label: "Heading" },
                  { key: "video", label: "Video URL", hint: "MP4 link, or put showreel.mp4 in the public folder and enter /showreel.mp4" },
                  { key: "poster", label: "Cover image", type: "image", hint: "Shown before the video loads" },
                ]} />
              </Card>
            )}

            {section === "contact" && (
              <Card title="Contact details">
                <ObjectEditor value={draft.contact} onChange={(v) => set("contact", v)} fields={[
                  { key: "email", label: "Email" }, { key: "phone", label: "Phone", hint: "Without +91" },
                  { key: "whatsapp", label: "WhatsApp number", hint: "With country code, digits only" }, { key: "location", label: "Location" },
                  { key: "instagram", label: "Instagram URL" }, { key: "linkedin", label: "LinkedIn URL" }, { key: "youtube", label: "YouTube URL" },
                ]} />
              </Card>
            )}

            {section === "chatbot" && (
              <div className="space-y-6">
                <Card title="Assistant">
                  <ObjectEditor value={draft.chatbot} onChange={(v) => set("chatbot", v)} fields={[
                    { key: "name", label: "Name" }, { key: "greeting", label: "First message", type: "textarea" },
                  ]} />
                </Card>
                <Card title="Questions and answers" note="The chatbot matches visitor messages to these keywords. Add Hindi and Hinglish words too (kitna, kab, banwana).">
                  <ListEditor items={draft.chatbot.faqs} titleKey="q" addLabel="Add question"
                    onChange={(v) => set("chatbot", { ...draft.chatbot, faqs: v })}
                    newItem={() => ({ id: uid(), q: "", a: "", keywords: [] })}
                    fields={[{ key: "q", label: "Question" }, { key: "a", label: "Answer", type: "textarea" }, { key: "keywords", label: "Keywords", type: "tags" }]} />
                </Card>
              </div>
            )}

            {section === "backup" && <Backup draft={draft} onImport={(c) => { if (!confirm(`Replace the live website content with this backup? Current content stays in History.${dirty ? " Your unsaved changes here will be replaced too." : ""}`)) return; saveContent(c, "Content imported and live", true); }} onReset={() => saveContent(defaultContent, "Default content restored", true)} />}
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {toast && (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl" role="status">
              <Check size={16} className="text-lav-300" /> {toast}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </MediaDeleteContext.Provider>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Overview({ draft, go }: { draft: SiteContent; go: (s: SectionId) => void }) {
  const tiles: { id: SectionId; label: string; count: number }[] = [
    { id: "services", label: "Services", count: draft.services.length },
    { id: "products", label: "Products", count: draft.products.length },
    { id: "projects", label: "Projects", count: draft.projects.length },
    { id: "industries", label: "Industries", count: draft.industries.length },
    { id: "testimonials", label: "Testimonials", count: draft.testimonials.length },
    { id: "chatbot", label: "Chatbot answers", count: draft.chatbot.faqs.length },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {tiles.map((t, i) => (
          <motion.button key={t.id} onClick={() => go(t.id)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="group rounded-3xl border border-line bg-white p-6 text-left transition hover:border-ink">
            <p className="font-display text-4xl font-semibold">{t.count}</p>
            <p className="mt-1 text-muted group-hover:text-ink">{t.label}</p>
          </motion.button>
        ))}
      </div>
      <Card title="How saving works">
        <div className="space-y-3 text-[15px] leading-relaxed text-muted">
          <p>Website text and images are saved in the database. When you press Save changes, the live website updates for every visitor.</p>
          <p>Enquiries from the contact forms and project planner arrive in <button onClick={() => go("leads")} className="font-semibold text-lav-700 underline">Leads</button>. Intern records save as soon as you change them. Applications from the Internship page appear in <button onClick={() => go("interns")} className="font-semibold text-lav-700 underline">Interns</button> automatically.</p>
        </div>
      </Card>
    </div>
  );
}

function Backup({ draft, onImport, onReset }: { draft: SiteContent; onImport: (c: SiteContent) => void; onReset: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const download = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `content.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <Card title="Download content" note="Saves all website text, images and settings as a file you can keep as a backup.">
        <button onClick={download} className="btn-dark"><Download size={17} /> Download content.json</button>
      </Card>
      <Card title="Import content" note="Load a content.json downloaded earlier. This replaces the live website content.">
        <input ref={file} type="file" accept="application/json" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          e.target.value = "";
          let parsed: unknown;
          try { parsed = JSON.parse(await f.text()); }
          catch { setError("That file isn't a valid content.json. Download one from this page and try again."); return; }
          // Must look like site content: a plain object with at least one known top-level key.
          const known = Object.keys(defaultContent);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Object.keys(parsed).some((k) => known.includes(k))) {
            setError("That file doesn't contain website content. Choose a content.json downloaded from this page.");
            return;
          }
          try { const merged = mergeContent(defaultContent, parsed as Partial<SiteContent>); setError(""); onImport(merged); }
          catch { setError("That file isn't a valid content.json. Download one from this page and try again."); }
        }} />
        <button onClick={() => file.current?.click()} className="btn-ghost"><Upload size={17} /> Choose file</button>
        {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
      </Card>
      <Card title="Restore defaults" note="Replaces the live website content with the original built-in content.">
        <button onClick={() => { if (confirm("Replace the live website content with the original content? This can't be undone unless you have a backup.")) onReset(); }} className="btn border border-red-200 text-red-600 hover:bg-red-50"><RotateCcw size={17} /> Restore defaults</button>
      </Card>
    </div>
  );
}
