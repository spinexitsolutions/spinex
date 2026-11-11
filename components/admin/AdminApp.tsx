"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  PiggyBank, Sparkles, CaseSensitive, Handshake, Settings, ShieldCheck, ChevronRight, LayoutDashboard, RectangleHorizontal, PanelBottom, MessageCircle, ArrowLeftRight, MousePointer2, Type, Info, Layers, Briefcase, Building2, Quote, Film, Phone, Bot, DatabaseBackup,
  LogOut, LifeBuoy, Bell, BellOff, ExternalLink, Plug, UserCog, Image as ImageIcon, Images, Search, Newspaper, LayoutTemplate, PanelTop, ListOrdered, Target, CalendarClock, Package, KeyRound, Palette, History, GraduationCap, Check, BadgeCheck, MailCheck, ReceiptIndianRupee, FileSignature, MapPin, BookOpen, UsersRound, Timer, UserRound, ScrollText, Eye, Download, Upload, RotateCcw, Menu, X, Users, Award, Loader2, Inbox, Wallet, CalendarCheck, Video, Star, MessageSquareHeart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useContent } from "../ContentProvider";
import { INDUSTRY_ICONS } from "@/lib/industry-icons";
import { SERVICE_ANIMS } from "@/lib/service-anims";
import { FAQ_HELP, defaultContent, defaultFooter, defaultMobileBar, defaultProcessExtras, mergeContent, LATER_SERVICES, PROJECT_DISPLAYS, type FooterSettings, type MobileBar, type ProcessExtras, type SiteContent } from "@/lib/content";
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
import TypeEditor from "./TypeEditor";
import ReplyPreview from "./ReplyPreview";
import BillingManager from "./BillingManager";
import LettersManager from "./LettersManager";
import CitiesEditor from "./CitiesEditor";
import ProfileEditor from "./ProfileEditor";
import ClientsManager from "./ClientsManager";
import PayrollManager from "./PayrollManager";
import AttendanceManager from "./AttendanceManager";
import BookingsManager from "./BookingsManager";
import ReviewsManager from "./ReviewsManager";
import FeedbackManager from "./FeedbackManager";
import AccountsManager from "./AccountsManager";
import IntroEditor from "./IntroEditor";
import HeroEditor from "./HeroEditor";
import CustomCursor from "../CustomCursor";
import IntroAnimation from "../intro/IntroAnimation";
import { introSettings } from "../Intro";
import AutomationPanel from "./AutomationPanel";
import AccountPanel from "./AccountPanel";
import ActivityPanel from "./ActivityPanel";
import { can, roleLabel, type Access, type Perm, type Role } from "@/lib/roles";
import { LEAD_ALERT_KEY, LiveProvider, ding, leadAlertOn, useBadges, useLeadAlert } from "./live";
import { SITE_URL } from "@/lib/site";

const sections = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard, group: "" , perm: "stats" },
  { id: "leads", label: "Leads", Icon: Inbox, group: "CRM" , perm: "leads" },
  { id: "bookings", label: "Call bookings", Icon: Video, group: "CRM" , perm: "bookings" },
  { id: "clients", label: "Clients and portal", Icon: UsersRound, group: "CRM" , perm: "clients" },
  { id: "feedback", label: "Client feedback", Icon: MessageSquareHeart, group: "CRM" , perm: "reviews" },
  { id: "reviews", label: "Google reviews", Icon: Star, group: "CRM" , perm: "reviews" },
  { id: "replies", label: "Lead emails and alerts", Icon: MailCheck, group: "CRM" , perm: "content" },
  { id: "billing", label: "Quotes and invoices", Icon: ReceiptIndianRupee, group: "Sales and accounts" , perm: "billing" },
  { id: "accounts", label: "Expenses and profit", Icon: PiggyBank, group: "Sales and accounts" , perm: "accounts" },
  { id: "interns", label: "Interns", Icon: Users, group: "HR and team" , perm: "people" },
  { id: "attendance", label: "Attendance and leave", Icon: CalendarCheck, group: "HR and team" , perm: "payroll" },
  { id: "payslips", label: "Payslips", Icon: Wallet, group: "HR and team" , perm: "payroll" },
  { id: "letters", label: "HR letters", Icon: FileSignature, group: "HR and team" , perm: "people" },
  { id: "certificates", label: "Certificates", Icon: Award, group: "HR and team" , perm: "people" },
  { id: "home", label: "Home page", Icon: LayoutTemplate, group: "Website pages" , perm: "content" },
  { id: "hero", label: "Homepage hero", Icon: Type, group: "Website pages" , perm: "content" },
  { id: "pages", label: "Page headers", Icon: PanelTop, group: "Website pages" , perm: "content" },
  { id: "banners", label: "Page banners", Icon: ImageIcon, group: "Website pages" , perm: "content" },
  { id: "about", label: "About and stats", Icon: Info, group: "Website pages" , perm: "content" },
  { id: "careers", label: "Careers (jobs)", Icon: Briefcase, group: "Website pages" , perm: "content" },
  { id: "internship", label: "Internship", Icon: GraduationCap, group: "Website pages" , perm: "content" },
  { id: "cities", label: "City pages (local SEO)", Icon: MapPin, group: "Website pages" , perm: "content" },
  { id: "services", label: "Services", Icon: Layers, group: "Website content" , perm: "content" },
  { id: "products", label: "Products", Icon: Package, group: "Website content" , perm: "content" },
  { id: "projects", label: "Projects", Icon: Briefcase, group: "Website content" , perm: "content" },
  { id: "industries", label: "Industries", Icon: Building2, group: "Website content" , perm: "content" },
  { id: "process", label: "Process steps", Icon: ListOrdered, group: "Website content" , perm: "content" },
  { id: "testimonials", label: "Testimonials", Icon: Quote, group: "Website content" , perm: "content" },
  { id: "trusted", label: "Trusted by (clients)", Icon: Handshake, group: "Website content" , perm: "content" },
  { id: "goals", label: "Goal picker", Icon: Target, group: "Website content" , perm: "content" },
  { id: "planner", label: "Project planner", Icon: CalendarClock, group: "Website content" , perm: "content" },
  { id: "showreel", label: "Showreel video", Icon: Film, group: "Website content" , perm: "content" },
  { id: "profile", label: "Company profile (PDF)", Icon: BookOpen, group: "Website content" , perm: "content" },
  { id: "chatbot", label: "Chatbot and FAQ", Icon: Bot, group: "Website content" , perm: "content" },
  { id: "blog", label: "Blog posts", Icon: Newspaper, group: "Blog and media" , perm: "blog" },
  { id: "media", label: "Media", Icon: Images, group: "Blog and media" , perm: "media" },
  { id: "brand", label: "Logo and name", Icon: BadgeCheck, group: "Site settings" , perm: "content" },
  { id: "contact", label: "Contact details and page", Icon: Phone, group: "Site settings" , perm: "content" },
  { id: "theme", label: "Colours", Icon: Palette, group: "Site settings" , perm: "content" },
  { id: "fonts", label: "Fonts and text", Icon: CaseSensitive, group: "Site settings" , perm: "content" },
  { id: "intro", label: "Intro screen", Icon: Sparkles, group: "Site settings" , perm: "content" },
  { id: "buttons", label: "Buttons", Icon: RectangleHorizontal, group: "Site settings" , perm: "content" },
  { id: "navbar", label: "Navbar", Icon: PanelTop, group: "Site settings" , perm: "content" },
  { id: "footer", label: "Footer", Icon: PanelBottom, group: "Site settings" , perm: "integrations" },
  { id: "floating", label: "Floating buttons", Icon: MessageCircle, group: "Site settings" , perm: "integrations" },
  { id: "transitions", label: "Page transitions", Icon: ArrowLeftRight, group: "Site settings" , perm: "content" },
  { id: "cursor", label: "Cursor", Icon: MousePointer2, group: "Site settings" , perm: "content" },
  { id: "seo", label: "SEO", Icon: Search, group: "Site settings" , perm: "content" },
  { id: "integrations", label: "Analytics and cookies", Icon: Plug, group: "Site settings" , perm: "integrations" },
  { id: "team", label: "Team and roles", Icon: UserCog, group: "Admin and security" , perm: "users" },
  { id: "apikeys", label: "API keys", Icon: KeyRound, group: "Admin and security" , perm: "users" },
  { id: "automation", label: "Automation", Icon: Timer, group: "Admin and security" , perm: "users" },
  { id: "backup", label: "Backup and restore", Icon: DatabaseBackup, group: "Admin and security" , perm: "content" },
  { id: "history", label: "History", Icon: History, group: "Admin and security" , perm: "content" },
  { id: "activity", label: "Activity log", Icon: ScrollText, group: "Admin and security" , perm: "any" },
  { id: "account", label: "My account", Icon: UserRound, group: "Admin and security" , perm: "any" },
] as const;

// The sidebar: ten plain entries, always visible, no drop-downs. An entry with several screens opens a
// page of cards (one card per screen, with a line saying what is inside), grouped under small headings.
type Area = { id: string; label: string; Icon: LucideIcon; head: string; about: string; groups: { label: string; ids: string[] }[] };
const AREAS: Area[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard, head: "", about: "", groups: [{ label: "", ids: ["overview"] }] },
  { id: "crm", label: "Leads and clients", Icon: Inbox, head: "Business", about: "Enquiries, calls and the clients you work with.", groups: [
    { label: "Enquiries", ids: ["leads", "bookings", "replies"] },
    { label: "Clients", ids: ["clients", "feedback", "reviews"] },
  ] },
  { id: "sales", label: "Sales and accounts", Icon: ReceiptIndianRupee, head: "Business", about: "Quotes, invoices, expenses and profit.", groups: [{ label: "", ids: ["billing", "accounts"] }] },
  { id: "hr", label: "HR and team", Icon: Users, head: "Business", about: "Interns, attendance, payslips, letters and certificates.", groups: [{ label: "", ids: ["interns", "attendance", "payslips", "letters", "certificates"] }] },
  { id: "pages", label: "Pages", Icon: LayoutTemplate, head: "Website", about: "What each page of the website says and shows.", groups: [
    { label: "Pages", ids: ["home", "hero", "pages", "banners", "about", "internship", "careers", "cities"] },
    { label: "Content used on the pages", ids: ["services", "products", "projects", "industries", "process", "testimonials", "trusted", "goals", "planner", "showreel", "chatbot", "profile"] },
  ] },
  { id: "blog", label: "Blog", Icon: Newspaper, head: "Website", about: "", groups: [{ label: "", ids: ["blog"] }] },
  { id: "media", label: "Media", Icon: Images, head: "Website", about: "", groups: [{ label: "", ids: ["media"] }] },
  { id: "settings", label: "Site settings", Icon: Settings, head: "Website", about: "Everything that applies to the whole website. Pick what you want to change.", groups: [
    { label: "Basics", ids: ["brand", "contact"] },
    { label: "Look", ids: ["theme", "fonts", "buttons"] },
    { label: "Layout", ids: ["navbar", "footer", "floating"] },
    { label: "Effects", ids: ["intro", "transitions", "cursor"] },
    { label: "Google and tracking", ids: ["seo", "integrations", "apikeys"] },
  ] },
  { id: "team", label: "Team and security", Icon: ShieldCheck, head: "Admin", about: "Who can sign in, what runs by itself, and your own account.", groups: [{ label: "", ids: ["team", "automation", "activity", "account"] }] },
  { id: "backup", label: "Backup and history", Icon: History, head: "Admin", about: "Download a copy, restore one, or go back to an older version.", groups: [{ label: "", ids: ["backup", "history"] }] },
];
// Dashboard: the changes people make most, each saying where it lives.
const SHORTCUTS: { id: string; label: string; where: string; Icon: LucideIcon }[] = [
  { id: "home", label: "Edit the home page", where: "Pages", Icon: LayoutTemplate },
  { id: "blog", label: "Write a blog post", where: "Blog", Icon: Newspaper },
  { id: "projects", label: "Add a project", where: "Pages › Projects", Icon: Briefcase },
  { id: "products", label: "Add a product", where: "Pages › Products", Icon: Package },
  { id: "banners", label: "Change a banner", where: "Pages › Page banners", Icon: ImageIcon },
  { id: "navbar", label: "Change the menu", where: "Site settings › Navbar", Icon: PanelTop },
  { id: "theme", label: "Change colours", where: "Site settings › Colours", Icon: Palette },
  { id: "fonts", label: "Change fonts", where: "Site settings › Fonts and text", Icon: CaseSensitive },
];
const areaOf = (id: string) => AREAS.find((a) => a.groups.some((g) => g.ids.includes(id))) ?? AREAS[0];

// One line under each card saying what is inside.
const ABOUT: Record<string, string> = {
  leads: "Every enquiry from the website, WhatsApp and ads", bookings: "Calls people booked with you", replies: "Thank-you email, WhatsApp alert, ready messages",
  clients: "Client list and their portal logins", feedback: "Feedback clients sent you", reviews: "Rating and reviews pulled from Google",
  billing: "Quotations, invoices and payments", accounts: "Money out, money in, profit",
  interns: "Applications and current interns", attendance: "Attendance and leave requests", payslips: "Monthly payslips", letters: "Offer, experience and other letters", certificates: "Certificate design and signatures",
  home: "Which sections show and their headings", hero: "Headline, buttons and the box on the right", pages: "Title and intro at the top of each page", banners: "Banner picture of each page",
  about: "About text, founders and numbers", internship: "Open roles and applications", careers: "Jobs and hiring", cities: "Local pages for each city",
  services: "The services you offer", products: "Your own software", projects: "Work shown on the site", industries: "Who you work with", process: "The steps from call to launch",
  testimonials: "Client quotes", trusted: "Client logos and Google rating line", goals: "The “I want to…” picker", planner: "Project planner questions and prices", showreel: "The home page video", chatbot: "Assistant name and its answers", profile: "Company profile PDF",
  brand: "Logo, company name, tagline", contact: "Phone, email, address, social links, contact page", theme: "Brand colour and themes", fonts: "Fonts, heading animation, highlights", buttons: "Button style and hover effect",
  navbar: "Top menu style and hover", footer: "Big name and products column", floating: "WhatsApp button and phone bar", intro: "Opening animation", transitions: "Effect between pages", cursor: "Custom cursor and trail",
  seo: "Titles, descriptions, search text", integrations: "Google Analytics, pixel, cookie banner", apikeys: "Keys for connected services",
  team: "People and what each can do", automation: "Things that run by themselves", activity: "Who changed what", account: "Your name and password",
  backup: "Download or import the website content", history: "Older saved versions",
};

type SectionId = (typeof sections)[number]["id"];

export default function AdminApp() {
  return <AdminShell />;
}

function AdminShell() {
  const { content, update } = useContent();
  const [saving, setSaving] = useState(false);
  const [, setNewLeads] = useState(-1);
  const [draft, setDraft] = useState<SiteContent>(content);
  const [section, setSection] = useState<SectionId>("overview");
  const [me, setMe] = useState<{ email: string; name: string; role: Role; uid: string; access?: Partial<Access> | null } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) {
          window.location.href = "/admin/login";
          return;
        }
        setMe(d);
        // Open the section named in the address (e.g. /admin#billing), else the first one this role can open.
        const wanted = sections.find((x) => x.id === window.location.hash.slice(1));
        const first = sections.find((x) => x.perm === "any" || can(d, x.perm as Perm));
        if (wanted && (wanted.perm === "any" || can(d, wanted.perm as Perm))) setSection(wanted.id);
        else if (!can(d, "stats") && first) setSection(first.id);
      })
      .catch(() => undefined);
  }, []);
  const allowed = sections.filter((x) => !me || x.perm === "any" || can(me, x.perm as Perm));
  // What waits in each section (sidebar numbers), refreshed every 20 seconds; open screens reload on changes.
  const badges = useBadges(!!me, section);
  // Optional intro when the admin panel opens (Admin → Intro animation), once per visit.
  const [adminIntro, setAdminIntro] = useState(false);
  useEffect(() => {
    if (!me || !content.intro?.admin || !content.intro?.enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (sessionStorage.getItem("spinex-admin-intro")) return;
      sessionStorage.setItem("spinex-admin-intro", "1");
    } catch {
      return;
    }
    setAdminIntro(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!me]);
  // The open section never shows a number: you're looking at it.
  const badgeOf = (id: string) => (id === section ? 0 : badges[id]?.count ?? 0);
  const badgeTitle: Record<string, string> = { leads: "new leads", bookings: "new call bookings", clients: "new client messages", attendance: "new leave requests", billing: "quotations accepted, changes asked or payments received", feedback: "new feedback", reviews: "clients opened the review link", interns: "new applications" };
  const [toast, setToast] = useState("");
  const [nav, setNav] = useState(false);
  const [find, setFind] = useState("");
  // Which sidebar entry's page of cards is open (null = a screen is open).
  const [hub, setHub] = useState<string | null>(null);
  useEffect(() => { setHub(null); }, [section]);
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
    if (me && can(me, "content")) loadContent(false);
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
    // Each section gets its own entry in the browser history, so Back and Forward move between sections,
    // and a refresh or a shared link (e.g. /admin#leads) opens the same place.
    window.history.pushState(null, "", `#${id}`);
  };
  // Opens a screen and closes the page of cards.
  const open = (id: SectionId) => { setHub(null); go(id); };
  // "Add to Home screen" from the admin installs the admin app (opens at /admin), not the website.
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) { link = document.createElement("link"); link.rel = "manifest"; document.head.appendChild(link); }
    const before = link.href;
    link.href = "/admin-app.webmanifest";
    return () => { if (link) link.href = before; };
  }, []);
  // A ding and a browser notification when a new lead comes in.
  useLeadAlert(badges, () => go("leads"));
  // Back / Forward, or a link to another section on the same page (#billing): follow the address.
  useEffect(() => {
    const follow = () => {
      const id = window.location.hash.slice(1);
      const target = sections.find((x) => x.id === id);
      if (!target || !me || (target.perm !== "any" && !can(me, target.perm as Perm))) return;
      setSection((cur) => {
        if (cur === target.id) return cur;
        if (cur === "blog" && postDirty && !confirm("You have unsaved changes in this post. Leave without saving?")) {
          window.history.pushState(null, "", `#${cur}`);
          return cur;
        }
        setPostDirty(false);
        return target.id;
      });
    };
    window.addEventListener("popstate", follow);
    window.addEventListener("hashchange", follow);
    return () => {
      window.removeEventListener("popstate", follow);
      window.removeEventListener("hashchange", follow);
    };
  }, [me, postDirty]);
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
      // Saved and live: leave preview mode so this browser shows the live website again.
      fetch("/api/admin/preview", { method: "DELETE" }).catch(() => undefined);
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
  // Opens the website in a new tab with the unsaved changes, visible only to this person.
  const [previewing, setPreviewing] = useState(false);
  const preview = async () => {
    const tab = window.open("about:blank", "_blank");
    setPreviewing(true);
    try {
      const res = await fetch("/api/admin/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't open the preview.");
      const page: Record<string, string> = { services: "/services", projects: "/work", products: "/products", about: "/about", internship: "/internship", careers: "/careers", contact: "/contact", banners: "/about" };
      const url = page[section] ?? "/";
      if (tab) tab.location.href = url;
      else window.open(url, "_blank");
    } catch (e) {
      tab?.close();
      flash(e instanceof Error ? e.message : "Couldn't open the preview.");
    } finally {
      setPreviewing(false);
    }
  };
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
  const canCert = !!me && (can(me, "people", "edit") || can(me, "content", "edit"));
  // The server ignores integration changes from anyone but the owner or an admin.
  const canIntegrations = !!me && can(me, "integrations", "edit");
  // Sections this person may look at but not change (set per person in Team and roles).
  const currentPerm = (sections.find((x) => x.id === section)?.perm ?? "any") as string;
  const readOnly = !!me && currentPerm !== "any" && currentPerm !== "users" && currentPerm !== "stats" && !can(me, currentPerm as Perm, "edit");
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };
  const contentSection = !(["overview", "interns", "leads", "certificates", "letters", "payslips", "attendance", "accounts", "bookings", "reviews", "feedback", "clients", "media", "blog", "history", "team", "apikeys", "billing", "automation", "account", "activity"] as string[]).includes(section) && (!me || can(me, "content")) && !readOnly;
  const set = <K extends keyof SiteContent>(k: K, v: SiteContent[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const current = sections.find((s) => s.id === section)!;
  const hubArea = hub ? AREAS.find((a) => a.id === hub) ?? null : null;
  const curArea = areaOf(section);
  const curAreaItems = allowed.filter((x) => curArea.groups.some((g) => (g.ids as string[]).includes(x.id))).length;

  return (
    <LiveProvider value={badges}>
    {me && content.cursor?.admin && section !== "cursor" && <CustomCursor cfg={content.cursor} />}
    {adminIntro && <IntroAnimation cfg={introSettings(content.intro)} logo={content.brand.logo} onDone={() => setAdminIntro(false)} />}
    <MediaDeleteContext.Provider value={!!me && can(me, "media", "edit")}>
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
        <div className="relative mb-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search settings, leads, clients…" aria-label="Search the admin" data-admin-find
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30" />
        </div>
        <nav className="-mx-1 flex-1 space-y-0.5 overflow-y-auto px-1 [scrollbar-width:thin]" aria-label="Admin sections">
          {find.trim() ? (
            <>
              {allowed.filter((x) => `${x.label} ${areaOf(x.id).label} ${ABOUT[x.id] ?? ""}`.toLowerCase().includes(find.trim().toLowerCase())).map((x) => (
                <NavItem key={x.id} item={x} active={section === x.id} badge={badgeOf(x.id)} title={badgeTitle[x.id]} sub={areaOf(x.id).label} onClick={() => { open(x.id); setNav(false); setFind(""); }} />
              ))}
              <SearchHits q={find} onLead={(id) => { const w = window as Window & { __spxOpenLead?: string }; w.__spxOpenLead = id; go("leads"); setNav(false); setFind(""); setTimeout(() => window.dispatchEvent(new Event("spx-open-lead")), 50); }} />
            </>
          ) : (
            <>
              {AREAS.map((a, i) => {
                const items = allowed.filter((x) => a.groups.some((g) => (g.ids as string[]).includes(x.id)));
                if (!items.length) return null;
                const active = hub ? hub === a.id : areaOf(section).id === a.id;
                const total = items.reduce((n, x) => n + badgeOf(x.id), 0);
                const newHead = a.head && a.head !== AREAS[i - 1]?.head;
                return (
                  <div key={a.id}>
                    {newHead && <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white/35">{a.head}</p>}
                    <NavItem item={a} active={active} badge={active ? 0 : total} title="new"
                      onClick={() => { if (items.length === 1) open(items[0].id); else setHub(a.id); setNav(false); }} />
                  </div>
                );
              })}
            </>
          )}
        </nav>
        <a href="/" target="_blank" rel="noopener" className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 hover:bg-white/5" data-admin-site>
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.18)]" />
          <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{SITE_URL.replace(/^https?:\/\//, "")}</span><span className="block text-xs text-emerald-300">Live · open website</span></span>
          <ExternalLink size={14} className="text-white/50" />
        </a>
        {me && (
          <div className="mt-2 rounded-xl bg-white/5 px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{me.name}</p>
            <p className="truncate text-xs text-white/55">{roleLabel[me.role]} · {me.email}</p>
          </div>
        )}
        {me && can(me, "leads", "view") && <LeadAlertToggle />}
        <a href="/api/admin/guide" target="_blank" rel="noopener" data-admin-guide className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/60 hover:bg-white/10 hover:text-white">
          <LifeBuoy size={17} /> Help guide (PDF)
        </a>
        <button onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/60 hover:bg-white/10 hover:text-white">
          <LogOut size={17} /> Log out
        </button>
      </aside>
      {nav && <div className="fixed inset-0 z-30 bg-ink/50 lg:hidden" onClick={() => setNav(false)} />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/90 px-5 py-4 backdrop-blur sm:px-8">
          <button onClick={() => setNav(true)} className="lg:hidden" aria-label="Open menu"><Menu size={22} /></button>
          <div className="min-w-0 flex-1">
            {hubArea ? (
              <h1 className="truncate font-display text-xl font-semibold">{hubArea.label}</h1>
            ) : (
              <>
                {curArea.id !== "dashboard" && curAreaItems > 1 && (
                  <button type="button" onClick={() => setHub(curArea.id)} className="flex items-center gap-1 truncate text-xs font-semibold text-muted hover:text-lav-700" data-admin-crumb>
                    {curArea.label} <ChevronRight size={12} />
                  </button>
                )}
                <h1 className="truncate font-display text-xl font-semibold">{current.label}</h1>
              </>
            )}
          </div>
          <Link href="/" target="_blank" className="hidden items-center gap-2 text-sm text-muted hover:text-ink sm:flex"><ExternalLink size={15} /> View site</Link>
          {contentSection && dirty && <button onClick={() => setDraft(content)} className="btn-ghost px-4 py-2 text-sm">Discard</button>}
          {contentSection && dirty && <button onClick={preview} disabled={previewing} title="See the website with these changes before they go live (only you see it)" className="btn-ghost px-4 py-2 text-sm">{previewing ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Preview</button>}
          {contentSection && <button onClick={save} disabled={!dirty || saving} className="btn-dark px-5 py-2.5 text-sm disabled:cursor-default disabled:bg-line disabled:text-muted">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving</> : dirty ? "Save and publish" : "All saved"}
          </button>}
          {section === "certificates" && canCert && certDirty && <button onClick={() => setDraft((d) => ({ ...d, certificate: content.certificate }))} className="btn-ghost px-4 py-2 text-sm">Discard</button>}
          {section === "certificates" && canCert && <button onClick={saveCertificate} disabled={!certDirty || certSaving} className="btn-dark px-5 py-2.5 text-sm disabled:cursor-default disabled:bg-line disabled:text-muted">
            {certSaving ? <><Loader2 size={15} className="animate-spin" /> Saving</> : certDirty ? "Save certificate" : "All saved"}
          </button>}
        </header>

        {/* Lists you work through (leads, clients, invoices…) get a wider page than the forms. */}
        <main className={`mx-auto p-4 sm:p-8 ${(["overview", "leads", "clients", "billing", "bookings", "interns", "accounts", "attendance", "payslips", "letters", "activity"] as string[]).includes(section) || hubArea ? "max-w-[1240px]" : "max-w-4xl"}`}>
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
          {readOnly && (
            <p className="mb-6 rounded-2xl border border-lav-200 bg-lav-100 px-4 py-3 text-sm text-lav-700" role="status">
              <b>View only.</b> You can look at this section, but changes can&apos;t be saved. Ask the owner if you need to change something here.
            </p>
          )}
          {hubArea && (
            <motion.div key={hubArea.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} data-admin-hub={hubArea.id}>
              <h2 className="font-display text-3xl font-semibold tracking-tight">{hubArea.label}</h2>
              {hubArea.about && <p className="mt-1 text-muted">{hubArea.about}</p>}
              {hubArea.groups.map((g) => {
                const items = allowed.filter((x) => (g.ids as string[]).includes(x.id)).sort((x, y) => g.ids.indexOf(x.id) - g.ids.indexOf(y.id));
                if (!items.length) return null;
                return (
                  <div key={g.label || "all"}>
                    {g.label ? <p className="mb-2.5 mt-7 text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">{g.label}</p> : <div className="mt-6" />}
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((x) => (
                        <button key={x.id} type="button" onClick={() => open(x.id)} data-admin-card={x.id}
                          className="group flex items-center gap-3.5 rounded-2xl border border-line bg-white p-4 text-left transition hover:border-lav-300 hover:shadow-[0_16px_30px_-22px_rgba(87,69,181,0.5)]">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lav-100 text-lav-600"><x.Icon size={20} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{x.label}</span>
                            <span className="block truncate text-[13px] text-muted">{ABOUT[x.id] ?? ""}</span>
                          </span>
                          {badgeOf(x.id) > 0 && <span className="rounded-full bg-lav-600 px-2 py-0.5 text-xs font-bold tabular-nums text-white">{badgeOf(x.id)}</span>}
                          <ChevronRight size={16} className="shrink-0 text-muted/50 transition group-hover:translate-x-0.5 group-hover:text-lav-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
          <motion.div key={section} className={hubArea ? "hidden" : undefined} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {section === "overview" && <Dashboard go={(id) => go(id as SectionId)} name={me?.name ?? "there"} shortcuts={SHORTCUTS.filter((x) => allowed.some((y) => y.id === x.id))} />}

            {section === "team" && <UsersManager />}

            {section === "apikeys" && <ApiKeysManager />}

            {section === "billing" && <BillingManager canEditProfile={!!me && can(me, "billingDetails", "edit")} readOnly={readOnly} />}

            {section === "automation" && <AutomationPanel goApiKeys={() => go("apikeys")} />}

            {section === "account" && <AccountPanel />}

            {section === "activity" && <ActivityPanel all={!!me && can(me, "activity")} />}

            {section === "theme" && <ThemeEditor value={draft.theme} onChange={(v) => set("theme", v)} />}
            {section === "fonts" && <TypeEditor value={draft.typography} onChange={(v) => set("typography", v)} hero={draft.hero} accent={draft.hero.accent || draft.theme.accent} />}

            {section === "leads" && <LeadsManager onNewCount={setNewLeads} readOnly={readOnly} goApiKeys={() => go("apikeys")} />}

            {section === "interns" && <InternsManager mode="interns" readOnly={readOnly} />}

            {section === "letters" && <LettersManager readOnly={readOnly} />}

            {section === "clients" && <ClientsManager readOnly={readOnly} />}

            {section === "payslips" && <PayrollManager readOnly={readOnly} />}

            {section === "attendance" && <AttendanceManager readOnly={readOnly} />}

            {section === "bookings" && <BookingsManager goApiKeys={() => go("apikeys")} />}

            {section === "reviews" && <ReviewsManager goApiKeys={() => go("apikeys")} />}

            {section === "feedback" && <FeedbackManager />}
            {section === "accounts" && <AccountsManager readOnly={readOnly || (!!me && !can(me, "accounts", "edit"))} />}

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
                <InternsManager mode="certificates" readOnly={readOnly} />
              </div>
            )}

            {section === "brand" && (
              <Card title="Logo and company name">
                <ObjectEditor value={draft.brand} onChange={(v) => set("brand", v)} fields={[
                  { key: "name", label: "Company name" },
                  { key: "tagline", label: "Tagline", hint: "Shown in the footer" },
                  { key: "logo", label: "Logo", type: "image", hint: "Used in the navbar, footer, intro and browser tab" },
                ]} />
              </Card>
            )}

            {section === "hero" && <HeroEditor value={draft.hero} onChange={(v) => set("hero", v)} readOnly={readOnly} />}

            {section === "blog" && <PostsManager onDirtyChange={setPostDirty} readOnly={readOnly} />}

            {section === "home" && (
              <div className="space-y-6">
                <Card title="Sections on the home page" note="Turn sections on or off and change their order. Save changes to apply.">
                  <HomeLayoutEditor value={draft.homeLayout} onChange={(v) => set("homeLayout", v)} />
                </Card>
                <Card title="Section headings" note="The big heading and short line for each home page section.">
                  <div className="space-y-6">
                    {([
                      ["services", "Services"], ["why", "Why Spinex"], ["process", "Process"], ["work", "Projects"], ["industries", "Who we work with"],
                      ["goals", "Goal picker (small line above the sentence)"], ["planner", "Project planner"], ["testimonials", "Testimonials"], ["products", "Our products"], ["blog", "Latest articles"], ["faq", "FAQ"], ["contact", "Contact section"],
                    ] as const).map(([key, label]) => (
                      <div key={key} className="rounded-2xl border border-line p-4">
                        <p className="mb-3 text-sm font-semibold text-lav-700">{label}</p>
                        <ObjectEditor
                          value={key === "contact" ? { eyebrow: draft.sections.contact.eyebrow ?? "Start a project", ...draft.sections.contact } : key === "faq" ? { helpTitle: FAQ_HELP.helpTitle, helpText: FAQ_HELP.helpText, helpNote: FAQ_HELP.helpNote, ...draft.sections.faq } : draft.sections[key]}
                          onChange={(v) => set("sections", { ...draft.sections, [key]: v })}
                          fields={key === "contact" ? [
                            { key: "eyebrow", label: "Small line above the heading", hint: "Leave empty to hide it" },
                            { key: "heading", label: "Heading", hint: "Put words between * to colour them, e.g. Let's build what your business *needs next.*" },
                            { key: "intro", label: "Short line" },
                          ] : key === "faq" ? [
                            { key: "heading", label: "Heading" },
                            { key: "intro", label: "Short line" },
                            { key: "helpTitle", label: "Card heading", hint: "The dark card under the heading. Leave empty to hide the card" },
                            { key: "helpText", label: "Card text" },
                            { key: "helpNote", label: "Small line at the bottom of the card", hint: "Leave empty to hide it" },
                          ] : [
                            { key: "heading", label: "Heading" },
                            { key: "intro", label: "Short line" },
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Tools strip" note="The moving line of tool names under the hero.">
                  <ObjectEditor value={{ toolsTitle: draft.sections.toolsTitle ?? "Tools and platforms we work with", tools: draft.sections.tools }} onChange={(v) => set("sections", { ...draft.sections, tools: v.tools, toolsTitle: v.toolsTitle })} fields={[{ key: "toolsTitle", label: "Small heading above the logos", hint: "Leave empty to hide it" }, { key: "tools", label: "Tools", type: "tags", hint: "Next.js, React, WordPress, Shopify, Figma, Meta Ads, Google Ads, Premiere Pro, After Effects, Razorpay and Google Analytics show their logo; others get a letter badge" }]} />
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
                  fields={[{ key: "title", label: "Name" }, { key: "time", label: "Time", hint: "e.g. 3–5 days" }, { key: "short", label: "Short line on the step card", hint: "3–5 words, e.g. Short call about your goals. Empty uses the description." }, { key: "text", label: "Description", type: "textarea" }, { key: "gets", label: "What the client gets", type: "lines" }]} />
                <div className="mt-6">
                  <Card title="Timing and the strip under the steps" note="The steps play one after another while the section is on screen.">
                    {(() => {
                      const px = { ...defaultProcessExtras, ...(draft.processExtras ?? {}) };
                      const setPx = (v: Partial<ProcessExtras>) => set("processExtras", { ...px, ...v });
                      return (
                        <div className="space-y-4" data-process-extras>
                          <label className="block max-w-xs">
                            <span className="mb-1.5 block text-[13px] font-semibold">Seconds per step</span>
                            <input className="input" type="number" min={2} max={10} step={0.5} value={px.seconds} onChange={(e) => setPx({ seconds: Math.min(10, Math.max(2, Number(e.target.value) || 3)) })} />
                          </label>
                          <label className="flex items-center gap-3">
                            <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={px.ctaShow} onChange={(e) => setPx({ ctaShow: e.target.checked })} />
                            <span className="font-medium">Show the strip under the steps</span>
                          </label>
                          <ObjectEditor value={px} onChange={(v) => setPx(v as Partial<ProcessExtras>)} fields={[
                            { key: "ctaPoints", label: "Points (one per line)", type: "lines" },
                            { key: "ctaLabel", label: "Button text" },
                            { key: "ctaLink", label: "Button opens", hint: "e.g. /contact" },
                          ]} />
                        </div>
                      );
                    })()}
                  </Card>
                </div>
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

            {(section === "integrations" || section === "floating" || section === "footer") && (
              <div className="space-y-6">
                {!canIntegrations && <p className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-muted">Only the owner or an admin can change these.</p>}
                <fieldset disabled={!canIntegrations} className="space-y-6 disabled:opacity-70">
                {section === "floating" && <Card title="Floating WhatsApp button" note="A green button on every page that opens WhatsApp chat with you.">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={draft.integrations.whatsappButton} onChange={(e) => set("integrations", { ...draft.integrations, whatsappButton: e.target.checked })} />
                    <span className="font-medium">Show the WhatsApp button</span>
                  </label>
                  <div className="mt-5">
                    <ObjectEditor value={draft.integrations} onChange={(v) => set("integrations", v)} fields={[{ key: "whatsappText", label: "Message filled in for the visitor", type: "textarea" }]} />
                  </div>
                  <p className="mt-3 text-sm text-muted">The number comes from Contact details.</p>
                </Card>}
                {section === "floating" && <Card title="Bottom bar on phones" note="A slim bar fixed to the bottom of the screen on phones with Call, WhatsApp and Get a quote buttons. It doesn't show on computers. While it is on, the floating WhatsApp button is hidden on phones (the bar already has WhatsApp).">
                  {(() => {
                    const mb = { ...defaultMobileBar, ...(draft.integrations.mobileBar ?? {}) };
                    const setMb = (v: Partial<MobileBar>) => set("integrations", { ...draft.integrations, mobileBar: { ...mb, ...v } });
                    return (
                      <div className="space-y-4" data-mobile-bar-settings>
                        <label className="flex items-center gap-3">
                          <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={mb.show} onChange={(e) => setMb({ show: e.target.checked })} />
                          <span className="font-medium">Show the bottom bar on phones</span>
                        </label>
                        <div className="flex flex-wrap gap-x-6 gap-y-3 pl-8">
                          {([["call", "Call"], ["whatsapp", "WhatsApp"], ["quote", "Get a quote"]] as const).map(([k, l]) => (
                            <label key={k} className="flex items-center gap-2 text-sm">
                              <input type="checkbox" className="h-4 w-4 accent-lav-600" checked={mb[k]} onChange={(e) => setMb({ [k]: e.target.checked } as Partial<MobileBar>)} /> {l}
                            </label>
                          ))}
                        </div>
                        <ObjectEditor value={mb} onChange={(v) => setMb(v as Partial<MobileBar>)} fields={[
                          { key: "quoteLabel", label: "Third button text", hint: "e.g. Get a quote, Free consultation" },
                          { key: "quoteLink", label: "Third button opens", hint: "e.g. /contact or /book" },
                        ]} />
                        <p className="text-sm text-muted">Phone and WhatsApp numbers come from Contact details.</p>
                      </div>
                    );
                  })()}
                </Card>}
                {section === "footer" && <Card title="Footer" note="The big word at the bottom of the footer and the products column.">
                  {(() => {
                    const ft = { ...defaultFooter, ...(draft.integrations.footer ?? {}) };
                    const setFt = (v: Partial<FooterSettings>) => set("integrations", { ...draft.integrations, footer: { ...ft, ...v } });
                    return (
                      <div className="space-y-4" data-footer-settings>
                        <ObjectEditor value={ft} onChange={(v) => setFt(v as Partial<FooterSettings>)} fields={[
                          { key: "wordmark", label: "Big word at the bottom", hint: "Shown with wide letter spacing, e.g. SPINEX. Leave empty to hide it" },
                        ]} />
                        <label className="flex items-center gap-3">
                          <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={ft.animate} onChange={(e) => setFt({ animate: e.target.checked })} />
                          <span className="font-medium">Animate the big word (letters open up from a soft blur when the footer comes into view)</span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={ft.products} onChange={(e) => setFt({ products: e.target.checked })} />
                          <span className="font-medium">Show the &quot;Our products&quot; column with pictures</span>
                        </label>
                        <p className="text-sm text-muted">Email, phone, address and social links come from Contact details. The short line under the logo is the brand tagline.</p>
                      </div>
                    );
                  })()}
                </Card>}
                {section === "integrations" && <Card title="Cookie banner" note="Asks visitors to accept or reject cookies. While it is on, Google Analytics, Clarity, Meta Pixel and Tag Manager run only for visitors who press Accept. Visitors can change their choice from 'Cookie settings' in the footer.">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={!!draft.integrations.cookieBanner} onChange={(e) => set("integrations", { ...draft.integrations, cookieBanner: e.target.checked })} />
                    <span className="font-medium">Show the cookie banner</span>
                  </label>
                  <div className="mt-5">
                    <ObjectEditor value={draft.integrations} onChange={(v) => set("integrations", v)} fields={[{ key: "cookieText", label: "Banner text", type: "textarea", hint: "A link to the Privacy Policy is added after it" }]} />
                  </div>
                </Card>}
                {section === "integrations" && <Card title="Analytics" note="See how many people visit, which pages they open and where they leave. Leave empty to turn off.">
                  <ObjectEditor value={draft.integrations} onChange={(v) => set("integrations", v)} fields={[
                    { key: "gaId", label: "Google Analytics 4 ID", hint: "looks like G-XXXXXXXXXX" },
                    { key: "clarityId", label: "Microsoft Clarity project ID", hint: "10 letters, from clarity.microsoft.com" },
                    { key: "metaPixelId", label: "Meta (Facebook) Pixel ID", hint: "numbers only, from Meta Events Manager" },
                    { key: "gtmId", label: "Google Tag Manager ID", hint: "looks like GTM-XXXXXXX" },
                  ]} />
                </Card>}
                </fieldset>
                {me && can(me, "users") && <p className="text-sm text-muted">API keys (email, AI chatbot, spam protection, webhooks) and custom code are in <button onClick={() => go("apikeys")} className="font-semibold text-lav-700 underline">API keys</button> (owner only).</p>}
              </div>
            )}

            {section === "history" && <HistoryPanel dirty={dirty} onRestored={(c, updated) => { if (updated !== null) baseUpdated.current = updated; setConflict(""); update(c); setDraft(c); flash("Older version restored and live"); }} />}

            {section === "seo" && (
              <div className="space-y-6">
                <Card title="Google search result" note="How the home page appears on Google. Keep the title under 60 characters and the description between 140 and 160.">
                  <div className="mb-6 rounded-2xl border border-line p-5">
                    <p className="text-xs text-muted">{SITE_URL.replace(/^https?:\/\//, "")}</p>
                    <p className="mt-1 truncate text-lg text-[#1a0dab]">{draft.seo.metaTitle}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{draft.seo.metaDescription}</p>
                  </div>
                  <ObjectEditor value={draft.seo} onChange={(v) => set("seo", v)} fields={[
                    { key: "metaTitle", label: "Page title", hint: `${draft.seo.metaTitle.length} characters` },
                    { key: "metaDescription", label: "Description", type: "textarea", hint: `${draft.seo.metaDescription.length} characters` },
                    { key: "keywords", label: "Keywords", type: "tags" },
                  ]} />
                </Card>
                <Card title="Google, Bing and AI search" note="Connect the website to Google Search Console and Bing Webmaster Tools, and let AI assistants (ChatGPT, Claude, Perplexity, Gemini) read a summary of your business.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-semibold">Google verification code</span>
                      <input className="input" name="googleVerification" value={draft.seo.googleVerification ?? ""} onChange={(e) => set("seo", { ...draft.seo, googleVerification: e.target.value })} placeholder="Paste the code or the whole <meta> tag" />
                      <span className="mt-1 block text-xs text-muted">Search Console → Add property → URL prefix → HTML tag.</span>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-semibold">Bing verification code</span>
                      <input className="input" name="bingVerification" value={draft.seo.bingVerification ?? ""} onChange={(e) => set("seo", { ...draft.seo, bingVerification: e.target.value })} placeholder="Paste the code or the whole <meta> tag" />
                      <span className="mt-1 block text-xs text-muted">Bing Webmaster Tools → Add site → HTML meta tag. Or import from Search Console.</span>
                    </label>
                  </div>
                  <label className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-line p-4">
                    <span><b>Tell Bing when pages change (IndexNow)</b><span className="block text-sm text-muted">After you save or publish a blog post, Bing and other search engines are told right away. Bing also powers ChatGPT search and Copilot.</span></span>
                    <input type="checkbox" className="h-5 w-5" checked={draft.seo.indexNow !== false} onChange={(e) => set("seo", { ...draft.seo, indexNow: e.target.checked })} />
                  </label>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    {[["/sitemap.xml", "Sitemap"], ["/robots.txt", "Robots"], ["/llms.txt", "AI summary (llms.txt)"], ["/llms-full.txt", "AI full details"]].map(([href, label]) => (
                      <a key={href} href={href} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1.5 font-semibold hover:border-ink">{label} ↗</a>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted">Submit <b>{SITE_URL}/sitemap.xml</b> in both Google Search Console and Bing Webmaster Tools after the site is live.</p>
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
                <Card title="Founders" note="The people behind Spinex, shown on the About page under the intro. Use a clear, well-lit photo of each person (portrait, about 800 × 1000). Without a photo their initials are shown.">
                  <label className="flex items-center gap-3" data-founders-toggle>
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={!!draft.founders?.show} onChange={(e) => set("founders", { ...draft.founders, show: e.target.checked })} />
                    <span className="font-medium">Show the founders on the About page</span>
                  </label>
                  <div className="mt-5">
                    <ObjectEditor value={draft.founders} onChange={(v) => set("founders", v)} fields={[
                      { key: "heading", label: "Heading" },
                      { key: "intro", label: "Short line", type: "textarea" },
                    ]} />
                  </div>
                  <div className="mt-5">
                    <ListEditor items={draft.founders?.people ?? []} titleKey="name" addLabel="Add person" onChange={(v) => set("founders", { ...draft.founders, people: v })}
                      newItem={() => ({ id: uid(), name: "", role: "", bio: "", photo: "", linkedin: "" })}
                      fields={[
                        { key: "name", label: "Name" },
                        { key: "role", label: "Role", hint: "e.g. Founder, Co-Founder, Head of Design" },
                        { key: "bio", label: "Two lines about them", type: "textarea", hint: "What they do for clients, in one or two short sentences" },
                        { key: "photo", label: "Photo", type: "image" },
                        { key: "linkedin", label: "LinkedIn link (optional)" },
                      ]} />
                  </div>
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
                  { group: "Basic", key: "title", label: "Name" }, { group: "Basic", key: "short", label: "One-line summary" },
                  { group: "Basic", key: "description", label: "Description", type: "textarea" }, { group: "Basic", key: "tags", label: "Highlights", type: "tags" },
                  { group: "Basic", key: "image", label: "Image", type: "image" },
                  { group: "Home page card", key: "badge", label: "Badge", hint: "Small label on the home page card, e.g. New or Popular. Leave empty for none" },
                  { group: "Home page card", key: "anim", label: "Animation", type: "select", options: [{ value: "", label: "Auto (its own, or an icon)" }, ...SERVICE_ANIMS], hint: "The moving picture on the home page card. The order of cards is the order of this list (use the arrows)." },
                  { group: "Service page", key: "slug", label: "Page address", hint: "/services/… (e.g. website-development)" },
                  { group: "Google", key: "seoTitle", label: "Page title for Google", hint: "under 60 characters" },
                  { group: "Google", key: "seoDescription", label: "Description for Google", type: "textarea", hint: "140–160 characters" },
                  { group: "Service page", key: "features", label: "What you get (page side box)", type: "lines" },
                  { group: "Service page", key: "body", label: "Page text", type: "textarea", hint: "## for headings, - for lists, **bold**" },
                  { group: "Service page", key: "faqs", label: "FAQs", type: "textarea", hint: "Question on one line, answer on the next, blank line between" },
                ]} />
            )}

            {section === "products" && (
              <>
                <p className="mb-4 text-sm text-muted">Your own software and SaaS. Each product gets its own page at /products/… with a &quot;Book a demo&quot; form; requests arrive in Leads as &quot;Product demo request&quot;. The Products link appears in the menu once you add the first product.</p>
                <ListEditor items={draft.products} titleKey="name" addLabel="Add product" onChange={(v) => set("products", v)}
                  newItem={() => ({ id: uid(), name: "", slug: "", tagline: "", description: "", category: "", audience: "", status: "Live", image: "", gallery: [], features: [], price: "", demoUrl: "", buy: "", home: "", videoUrl: "", body: "", faqs: "", seoTitle: "", seoDescription: "" })}
                  fields={[
                    { group: "Basic", key: "name", label: "Product name" },
                    { group: "Basic", key: "slug", label: "Page address", hint: "/products/… e.g. waba-panel (leave empty to use the name)" },
                    { group: "Basic", key: "tagline", label: "One-line pitch", hint: "e.g. Send WhatsApp campaigns to thousands in one click" },
                    { group: "Basic", key: "status", label: "Status", type: "select", options: [{ value: "Live", label: "Live" }, { value: "Beta", label: "Beta" }, { value: "Coming soon", label: "Coming soon" }, { value: "", label: "Don't show" }] },
                    { group: "Basic", key: "description", label: "Short description", type: "textarea", hint: "2–3 lines, shown on the card and to Google" },
                    { group: "Basic", key: "category", label: "Category", hint: "e.g. WhatsApp marketing, CRM, Calling" },
                    { group: "Basic", key: "audience", label: "Made for", hint: "e.g. Marketing agencies, Clinics" },
                    { group: "Basic", key: "price", label: "Price", hint: "e.g. ₹2,999/month — empty shows \"Price on request\"" },
                    { group: "Photos and demo", key: "image", label: "Cover screenshot", type: "image" },
                    { group: "Photos and demo", key: "cardImage", label: "Products page card picture", type: "image", hint: "The designed picture on the Products page card. Leave empty to show the cover screenshot in a Spinex frame. Best size 1600×900 (1600×1200 for the big card)." },
                    { group: "Photos and demo", key: "cardTone", label: "Card colour", type: "select", options: [{ value: "", label: "Purple" }, { value: "orange", label: "Orange" }, { value: "pink", label: "Pink" }, { value: "blue", label: "Blue" }, { value: "green", label: "Green" }] },
                    { group: "Basic", key: "page", label: "On the Products page", type: "select", options: [{ value: "", label: "Normal card" }, { value: "featured", label: "Big card at the top" }], hint: "If none is chosen, the first product is the big card." },
                    { group: "Photos and demo", key: "gallery", label: "More screenshots", type: "images" },
                    { group: "Product page", key: "features", label: "Key features", type: "lines" },
                    { group: "Basic", key: "home", label: "On the home page", type: "select", options: [{ value: "featured", label: "Big card (main product)" }, { value: "", label: "Small card" }, { value: "hide", label: "Don't show" }], hint: "One product can be the big card; if none is chosen, the first product is. Up to 4 small cards show under it. Turn the whole section on or off in Home page → Sections." },
                    { group: "Basic", key: "homePoints", label: "Short points for the home page", type: "lines", hint: "One per line, a few words each, e.g. Password vault with 2FA codes. The big card shows 3, small cards show 2. Leave empty to use the first features." },
                    { group: "Basic", key: "buy", label: "Buy now button", type: "select", options: [{ value: "", label: "No (only Book a free demo)" }, { value: "whatsapp", label: "Yes, Buy now on WhatsApp" }], hint: "Opens your WhatsApp with \"I want to buy …\" ready to send. Good for one-time products." },
                    { group: "Photos and demo", key: "demoUrl", label: "Live demo link", hint: "Optional. Anyone can open it, so don't put a paid download link here." },
                    { group: "Photos and demo", key: "videoUrl", label: "YouTube video link", hint: "Optional, shown on the page" },
                    { group: "Product page", key: "body", label: "Page text", type: "textarea", hint: "## for headings, - for lists, **bold**" },
                    { group: "Product page", key: "faqs", label: "FAQs", type: "textarea", hint: "Question on one line, answer on the next, blank line between" },
                    { group: "Google", key: "seoTitle", label: "Page title for Google", hint: "under 60 characters" },
                    { group: "Google", key: "seoDescription", label: "Description for Google", type: "textarea", hint: "140–160 characters" },
                  ]} />
              </>
            )}

            {section === "projects" && (
              <>
              <p className="mb-4 text-sm text-muted">Projects show on the home page (5: one big, four small), the Work page, and on the matching service page. &quot;Show as&quot; picks the frame: website in a laptop, social media as an Instagram profile, video in a player, ads with results, design as a collage, e-commerce management as a seller dashboard, on-demand apps as customer app + admin + partner app. Fill only the fields that frame uses; the hint on each field says which.</p>
              <ListEditor items={draft.projects} titleKey="title" subKey="category" addLabel="Add project" onChange={(v) => set("projects", v)}
                newItem={() => ({ id: uid(), title: "", type: "client" as const, display: "" as const, category: "", summary: "", image: "", url: "" })}
                fields={[
                  { group: "Basic", key: "title", label: "Project name" },
                  { group: "Basic", key: "type", label: "Type", type: "select", hint: "Demo = made to show our skills, gets a \"Demo\" label", options: [{ value: "client", label: "Client project" }, { value: "demo", label: "Demo / concept" }] }, { group: "Basic", key: "category", label: "Category", hint: "Filter tab on the Work page. Pick a service below so the project also shows on that service's page.", suggest: draft.services.map((x) => x.title),
                    warn: (v) => { const c = String(v ?? "").trim().toLowerCase(); return c && !draft.services.some((x) => x.title.trim().toLowerCase() === c) ? "This category doesn't match any service, so the project won't show on a service page. Pick one of the services above." : ""; } },
                  { group: "Basic", key: "display", label: "Show as", type: "select", hint: "Auto picks from the category", options: [{ value: "", label: "Auto (from category)" }, ...PROJECT_DISPLAYS] },
                  { group: "Basic", key: "home", label: "On the home page", type: "select", options: [{ value: "", label: "Small card" }, { value: "featured", label: "Big card (main project)" }, { value: "hide", label: "Don't show" }], hint: "The home page shows 5 projects: one big card and 4 small ones. If none is set as big, the first client project is." },
                  { group: "Basic", key: "summary", label: "Short description", type: "textarea" }, { group: "Basic", key: "url", label: "Live link", hint: "Optional" },
                  { group: "Photos and video", key: "image", label: "Cover image", type: "image", hint: "All types. Also the video poster and the social profile photo" },
                  { group: "Photos and video", key: "hero", label: "Hero screenshot (website)", type: "image", hint: "Website projects: a screenshot of just the first screen of the site, 16:9 (e.g. 1600×900). Shown inside a Mac window on the Home and Work cards. Leave empty to use the top of the full-page screenshot." },
                  { group: "Photos and video", key: "screen", label: "Full-page screenshot / dashboard", type: "image", hint: "Website: full-page desktop screenshot (scrolls in the laptop). Custom software: dashboard screenshot. E-commerce: seller dashboard. On-demand: admin panel. Use JPG under 4 MB" },
                  { group: "Photos and video", key: "mobile", label: "Mobile screenshot", type: "image", hint: "Website: mobile view. Mobile app or on-demand: main app screen" },
                  { group: "Photos and video", key: "partner", label: "Partner app screenshot", type: "image", hint: "Mobile app or on-demand: a second app screen" },
                  { group: "Photos and video", key: "video", label: "Video link", hint: "Website or Video: YouTube link or .mp4 link. Plays muted on loop" },
                  { group: "Photos and video", key: "videoShape", label: "Video shape", type: "select", options: [{ value: "wide", label: "Wide 16:9 (YouTube)" }, { value: "reel", label: "Reel 9:16 (Instagram / Shorts)" }] },
                  { group: "Photos and video", key: "images", label: "More images", type: "images", hint: "Social: 6–9 posts · Design: 3–6 pieces · Ads: ad creative · E-commerce: product photos (same order as Products below)" },
                  { group: "Results and details", key: "results", label: "Results", type: "lines", hint: "Label: value, e.g. Leads per month: 40 → 180 (only real numbers)" },
                  { group: "Results and details", key: "handle", label: "Account / brand name", hint: "Social: @handle · Ads: advertiser name · E-commerce: store name" },
                  { group: "Results and details", key: "platforms", label: "Marketplaces", type: "tags", hint: "E-commerce: Amazon, Flipkart, Meesho, Shopify" },
                  { group: "Results and details", key: "items", label: "Products (e-commerce)", type: "lines", hint: "Name | price | note, e.g. Cotton saree | ₹1,299 | 312 sold" },
                  { group: "Case study page", key: "hidePage", label: "Case study page", type: "select", options: [{ value: "", label: "Show a case study page" }, { value: "hide", label: "No page (card only)" }] },
                  { group: "Case study page", key: "slug", label: "Page address", hint: "/work/… e.g. sharma-jewellers-website (empty = from the name)" },
                  { group: "Case study page", key: "client", label: "Client name", hint: "Leave empty if the client wants to stay private" },
                  { group: "Case study page", key: "industry", label: "Industry", hint: "e.g. Jewellery, Healthcare" },
                  { group: "Case study page", key: "year", label: "Year", hint: "e.g. 2026" },
                  { group: "Case study page", key: "duration", label: "Timeline", hint: "e.g. 6 weeks" },
                  { group: "Case study page", key: "services", label: "What we did", type: "tags", hint: "e.g. Website, SEO, Meta ads" },
                  { group: "Case study page", key: "challenge", label: "The challenge", type: "textarea", hint: "The client's problem before working with us. ## for headings, - for lists" },
                  { group: "Case study page", key: "solution", label: "What we did", type: "textarea", hint: "Our approach and the work, step by step" },
                  { group: "Case study page", key: "outcome", label: "The result", type: "textarea", hint: "What changed. Put the big numbers in Results above" },
                  { group: "Case study page", key: "quote", label: "Client's words", type: "textarea", hint: "A short real quote from the client (optional)" },
                  { group: "Case study page", key: "quoteBy", label: "Quote by", hint: "e.g. Rahul Sharma, Owner" },
                  { group: "Google", key: "seoTitle", label: "Page title for Google", hint: "under 60 characters (optional)" },
                  { group: "Google", key: "seoDescription", label: "Description for Google", type: "textarea", hint: "140–160 characters (optional)" },
                ]} />
              </>
            )}

            {section === "profile" && <ProfileEditor value={draft.profile} onChange={(v) => set("profile", v)} />}

            {section === "cities" && <CitiesEditor cities={draft.cities ?? []} onChange={(v) => set("cities", v)} />}

            {section === "industries" && (
              <ListEditor items={draft.industries} titleKey="title" addLabel="Add industry" onChange={(v) => set("industries", v)}
                newItem={() => ({ id: uid(), title: "", description: "", image: "", points: [], icon: "building" })}
                fields={[
                  { key: "title", label: "Name", hint: "e.g. Hospitals and clinics" },
                  { key: "description", label: "What we do for them", hint: "One short sentence. On phones only the part before the first comma shows" },
                  { key: "icon", label: "Icon", type: "select", options: INDUSTRY_ICONS },
                ]} />
            )}

            {section === "testimonials" && (
              <>
                <p className="mb-4 text-sm text-muted">The testimonials section appears on the homepage once you add at least one. Use real client quotes only.</p>
                <Card title="Section heading" note="Shown above the testimonials on the home page.">
                  <ObjectEditor value={draft.sections.testimonials} onChange={(v) => set("sections", { ...draft.sections, testimonials: v })} fields={[{ key: "heading", label: "Heading" }, { key: "intro", label: "Short line" }]} />
                </Card>
                <div className="mt-6" />
                <ListEditor items={draft.testimonials} titleKey="name" addLabel="Add testimonial" onChange={(v) => set("testimonials", v)}
                  newItem={() => ({ id: uid(), name: "", role: "", quote: "", photo: "", rating: "5" })}
                  fields={[
                    { key: "name", label: "Client name", hint: "e.g. Rahul Sharma" },
                    { key: "role", label: "Role and company", hint: "e.g. Owner, Sharma Jewellers" },
                    { key: "quote", label: "What they said", type: "textarea", hint: "2–4 lines works best. Their real words." },
                    { key: "rating", label: "Stars", type: "select", options: [{ value: "5", label: "★★★★★ 5" }, { value: "4", label: "★★★★ 4" }, { value: "", label: "No stars" }] },
                    { key: "photo", label: "Client photo (optional)", type: "image", hint: "A square face photo. Without it, their initials are shown." },
                  ]} />
              </>
            )}

            {section === "replies" && (
              <div className="space-y-6">
                <Card title="Thank-you email to the visitor" note="Sent right after someone sends an enquiry with their email address. It goes from the email set up in API keys → Email alerts, and their reply comes to your 'Send alerts to' address. One email per address per day.">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={!!draft.leadReplies.autoReply} onChange={(e) => set("leadReplies", { ...draft.leadReplies, autoReply: e.target.checked })} />
                    <span className="font-medium">Send the thank-you email</span>
                  </label>
                  <div className="mt-5">
                    <ObjectEditor value={draft.leadReplies} onChange={(v) => set("leadReplies", v)} fields={[
                      { key: "replySubject", label: "Subject" },
                      { key: "replyTitle", label: "Heading inside the email" },
                      { key: "replyBody", label: "Message", type: "textarea", hint: "Leave a blank line for a new paragraph. {name} {service} {phone} {email} {company} are filled in automatically." },
                    ]} />
                  </div>
                  <label className="mt-5 flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={!!draft.leadReplies.replyWhatsappButton} onChange={(e) => set("leadReplies", { ...draft.leadReplies, replyWhatsappButton: e.target.checked })} />
                    <span className="font-medium">Add a &quot;Chat with us on WhatsApp&quot; button</span>
                  </label>
                  <p className="mt-1 pl-8 text-sm text-muted">Uses the WhatsApp number from Contact details.</p>
                  <p className="mb-3 mt-7 text-sm font-semibold text-lav-700">Preview (with a sample enquiry)</p>
                  <ReplyPreview content={draft} />
                </Card>
                <Card title="WhatsApp alert to you" note="A WhatsApp message to your number for every new enquiry, with the lead's details and a one-tap link to reply to them on WhatsApp. You still get the alert email too.">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={!!draft.leadReplies.whatsappAlert} onChange={(e) => set("leadReplies", { ...draft.leadReplies, whatsappAlert: e.target.checked })} />
                    <span className="font-medium">Send me a WhatsApp alert for new enquiries</span>
                  </label>
                  <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm text-muted">
                    Your number and the WhatsApp service are set in {me && can(me, "users") ? <button onClick={() => go("apikeys")} className="font-semibold text-lav-700 underline">API keys → WhatsApp alerts</button> : <b>API keys → WhatsApp alerts</b>} (owner only). There is a &quot;Send test WhatsApp&quot; button there. Until it is set up, nothing is sent.
                  </p>
                </Card>
                <Card title="Ready WhatsApp messages" note="When the team presses WhatsApp on a lead, they pick one of these and it opens WhatsApp with the message typed in. {name}, {service}, {company} and {phone} are filled in with the lead's details.">
                  <ListEditor items={draft.leadReplies.waTemplates ?? []} titleKey="label" addLabel="Add message" onChange={(v) => set("leadReplies", { ...draft.leadReplies, waTemplates: v })}
                    newItem={() => ({ id: uid(), label: "", text: "" })}
                    fields={[{ key: "label", label: "Button name", hint: "e.g. Quotation sent" }, { key: "text", label: "Message", type: "textarea" }]} />
                </Card>
              </div>
            )}

            {section === "trusted" && (
              <div className="space-y-6">
                <Card title="Client logo strip" note="A strip right under the hero with the logos (or names) of businesses you have worked with. Keep it off until you have 4–5 clients, then turn it on. Only add clients who are happy for you to show their name.">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={!!draft.trusted.show} onChange={(e) => set("trusted", { ...draft.trusted, show: e.target.checked })} />
                    <span className="font-medium">Show the client logo strip</span>
                  </label>
                  {draft.trusted.show && draft.trusted.items.length === 0 && <p className="mt-3 text-sm text-amber-700">Add at least one client below; the strip stays hidden until then.</p>}
                  {draft.trusted.items.length > 0 && draft.trusted.items.length < 4 && <p className="mt-3 text-sm text-muted">Tip: 4–6 clients with transparent PNG logos look best.</p>}
                  <div className="mt-5">
                    <ObjectEditor value={draft.trusted} onChange={(v) => set("trusted", v)} fields={[{ key: "title", label: "Line above the logos", hint: "e.g. Trusted by businesses across India" }]} />
                  </div>
                </Card>
                <Card title="Clients" note="No logo? Leave the logo empty and the client's name is shown in clean text instead. More than 6 clients scroll slowly in a line. Use the arrows to change the order.">
                  <ListEditor items={draft.trusted.items} titleKey="name" addLabel="Add client" onChange={(v) => set("trusted", { ...draft.trusted, items: v })}
                    newItem={() => ({ id: uid(), name: "", logo: "", url: "" })}
                    fields={[
                      { key: "name", label: "Client / business name" },
                      { key: "url", label: "Their website or Instagram (optional)", type: "url" },
                      { key: "logo", label: "Logo (optional)", type: "image", hint: "PNG with a transparent background looks best. It shows in grey and turns to colour on hover." },
                    ]} />
                </Card>
                <Card title="Google rating" note="A small line like ★ 4.9 on Google · 25 reviews, shown in the same strip. Turn it on once you have real reviews and keep the numbers the same as your Google profile.">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={!!draft.trusted.ratingShow} onChange={(e) => set("trusted", { ...draft.trusted, ratingShow: e.target.checked })} />
                    <span className="font-medium">Show the rating</span>
                  </label>
                  <div className="mt-5">
                    <ObjectEditor value={draft.trusted} onChange={(v) => set("trusted", v)} fields={[
                      { key: "rating", label: "Rating", hint: "e.g. 4.9" },
                      { key: "reviewCount", label: "Number of reviews", hint: "e.g. 25" },
                      { key: "ratingSource", label: "Where the reviews are", hint: "e.g. Google" },
                      { key: "reviewUrl", label: "Link to your reviews", type: "url", hint: "Your Google Business Profile link" },
                    ]} />
                  </div>
                </Card>
                <p className="text-sm text-muted">The strip&apos;s place on the home page can be changed in <button onClick={() => go("home")} className="font-semibold text-lav-700 underline">Home page</button>. Press Save to make changes live.</p>
              </div>
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
                  { key: "blogCover", label: "Blog: photo for posts without their own cover image", type: "image", hint: "Optional. Each post's own cover (Blog posts → Cover image) is used first." },
                ]} />
              </Card>
            )}

            {(section === "intro" || section === "transitions" || section === "cursor" || section === "navbar" || section === "buttons") && <IntroEditor key={section} part={section} value={draft.intro} onChange={(v) => set("intro", v)} cursor={draft.cursor} onCursor={(v) => set("cursor", v)} site={draft} logo={draft.brand.logo} readOnly={readOnly} />}

            {section === "showreel" && (
              <Card title="Showreel">
                <ObjectEditor value={{ eyebrow: "", intro: "", ...draft.showreel }} onChange={(v) => set("showreel", v)} fields={[
                  { key: "eyebrow", label: "Small line above the heading", hint: "e.g. Our story in 30 seconds. Leave empty to hide it" },
                  { key: "title", label: "Heading", hint: "Put words between * to colour them, e.g. One team. *Everything online.*" },
                  { key: "intro", label: "Short line under the heading" },
                  { key: "video", label: "Video URL", hint: "MP4 link, or put showreel.mp4 in the public folder and enter /showreel.mp4" },
                  { key: "poster", label: "Cover image", type: "image", hint: "Shown before the video loads" },
                  { key: "videoMobile", label: "Phone video URL (portrait 9:16)", hint: "Played on phones instead of the wide video, e.g. /showreel-mobile.mp4. Leave empty to use the wide video everywhere." },
                  { key: "posterMobile", label: "Phone cover image", type: "image", hint: "Portrait cover shown before the phone video loads" },
                ]} />
              </Card>
            )}

            {section === "contact" && (
              <div className="space-y-6">
              <Card title="Contact details">
                <ObjectEditor value={draft.contact} onChange={(v) => set("contact", v)} fields={[
                  { key: "email", label: "Email" }, { key: "phone", label: "Phone", hint: "Without +91" },
                  { key: "whatsapp", label: "WhatsApp number", hint: "With country code, digits only" }, { key: "location", label: "Location" },
                  { key: "instagram", label: "Instagram URL" }, { key: "linkedin", label: "LinkedIn URL" }, { key: "youtube", label: "YouTube URL" },
                ]} />
              </Card>
              <Card title="Contact page" note="The dark box with the form, the office hours card and the questions at the end of the contact page. Wrap words in *stars* to highlight them in the heading.">
                <ObjectEditor value={draft.contactPage} onChange={(v) => set("contactPage", v)} fields={[
                  { key: "eyebrow", label: "Small label" }, { key: "heading", label: "Heading" }, { key: "intro", label: "Intro", type: "textarea" },
                  { key: "hours", label: "Office hours" }, { key: "hoursNote", label: "Office hours note" }, { key: "emailNote", label: "Email card note" },
                  { key: "faqTitle", label: "Questions heading" },
                ]} />
                <label className="mt-5 flex items-center gap-3 text-sm font-medium">
                  <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={draft.contactPage.showMap} onChange={(e) => set("contactPage", { ...draft.contactPage, showMap: e.target.checked })} />
                  Show the Google map
                </label>
              </Card>
              <Card title="What happens next (steps)">
                <ListEditor items={draft.contactPage.steps} titleKey="title" addLabel="Add step"
                  onChange={(v) => set("contactPage", { ...draft.contactPage, steps: v })}
                  newItem={() => ({ id: uid(), title: "", note: "" })}
                  fields={[{ key: "title", label: "Step" }, { key: "note", label: "Right side note", hint: "Short, like Free or 1 to 2 days" }]} />
              </Card>
              <Card title="Contact page questions">
                <ListEditor items={draft.contactPage.faqs} titleKey="q" addLabel="Add question"
                  onChange={(v) => set("contactPage", { ...draft.contactPage, faqs: v })}
                  newItem={() => ({ id: uid(), q: "", a: "" })}
                  fields={[{ key: "q", label: "Question" }, { key: "a", label: "Answer", type: "textarea" }]} />
              </Card>
              </div>
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
    </LiveProvider>
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

// Sidebar switch for the new-lead sound and notification (remembered on this computer).
function LeadAlertToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(leadAlertOn()), []);
  const flip = async () => {
    const next = !on;
    setOn(next);
    try { localStorage.setItem(LEAD_ALERT_KEY, next ? "on" : "off"); } catch {}
    if (next) {
      ding();
      try { if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission(); } catch {}
    }
  };
  return (
    <button type="button" onClick={flip} data-lead-alert={on ? "on" : "off"} title="Plays a sound and shows a notification when a new lead arrives while the admin is open" className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white/60 hover:bg-white/10 hover:text-white">
      {on ? <Bell size={17} /> : <BellOff size={17} />} New-lead sound: {on ? "On" : "Off"}
    </button>
  );
}

// Results from leads, clients and quotes/invoices under the sidebar search box.
function SearchHits({ q, onLead }: { q: string; onLead: (id: string) => void }) {
  const [hits, setHits] = useState<{ kind: "lead" | "client" | "bill"; id: string; title: string; sub: string; href: string }[] | null>(null);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits(null); return; }
    let stop = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, { cache: "no-store" });
        const d = r.ok ? await r.json() : [];
        if (!stop) setHits(Array.isArray(d) ? d : []);
      } catch {
        if (!stop) setHits([]);
      }
    }, 250);
    return () => { stop = true; clearTimeout(t); };
  }, [q]);
  if (q.trim().length < 2) return null;
  if (hits === null) return <p className="px-3 py-2 text-xs text-white/40">Searching…</p>;
  if (!hits.length) return <p className="px-3 py-2 text-sm text-white/50">No lead, client or invoice found.</p>;
  const label = { lead: "Lead", client: "Client", bill: "Quote / invoice" } as const;
  return (
    <div className="mt-2 border-t border-white/10 pt-2" data-search-hits>
      {hits.map((h) => (
        <a key={`${h.kind}${h.id}`} href={h.href} onClick={(e) => { if (h.kind === "lead") { e.preventDefault(); onLead(h.id); } }} className="block rounded-xl px-3 py-2 hover:bg-white/10">
          <span className="flex items-center gap-2"><span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">{label[h.kind]}</span><span className="truncate text-sm font-medium">{h.title}</span></span>
          {h.sub && <span className="mt-0.5 block truncate text-xs text-white/45">{h.sub}</span>}
        </a>
      ))}
    </div>
  );
}

function NavItem({ item, active, badge, title, sub, onClick }: {
  item: { id: string; label: string; Icon: LucideIcon };
  active: boolean; badge: number; title?: string; sub?: string; onClick: () => void;
}) {
  const { Icon } = item;
  return (
    <button onClick={onClick} data-admin-nav={item.id} className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14.5px] font-medium">
      {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-lav-600" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
      <Icon size={17} className={`relative shrink-0 ${active ? "text-white" : "text-white/50"}`} />
      <span className={`relative flex-1 ${active ? "text-white" : "text-white/70"}`}>
        {item.label}
        {sub && <span className="block text-[11px] text-white/40">{sub}</span>}
      </span>
      {badge > 0 && <span title={`${badge} ${title ?? ""}`} className="relative rounded-full bg-lav-500 px-2 py-0.5 text-xs font-bold tabular-nums text-white">{badge}</span>}
    </button>
  );
}
