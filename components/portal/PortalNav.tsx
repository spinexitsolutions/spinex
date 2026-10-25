"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FileText, FolderOpen, LayoutDashboard, LifeBuoy, LogOut, Menu, X } from "lucide-react";

const LINKS = [
  { href: "/portal", label: "Overview", Icon: LayoutDashboard },
  { href: "/portal/files", label: "Files", Icon: FolderOpen },
  { href: "/portal/invoices", label: "Invoices", Icon: FileText },
  { href: "/portal/support", label: "Support", Icon: LifeBuoy },
];

export default function PortalNav({ brand, logo, name, company, unread }: { brand: string; logo: string; name: string; company: string; unread: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const logout = async () => {
    await fetch("/api/portal/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/portal/login";
  };
  const nav = (
    <nav className="mt-8 grid gap-1">
      {LINKS.map(({ href, label, Icon }) => {
        const on = href === "/portal" ? path === "/portal" : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium ${on ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"}`}>
            <Icon size={17} /> {label}
            {label === "Support" && unread > 0 && <span className="ml-auto rounded-full bg-lav-500 px-2 py-0.5 text-[11px] font-bold text-white">{unread}</span>}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 text-white lg:hidden">
        <span className="flex items-center gap-2 font-display font-semibold">{logo ? <img src={logo} alt="" className="h-7 w-7 object-contain" /> : null}{brand}</span>
        <button onClick={() => setOpen((v) => !v)} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-full bg-white/10">{open ? <X size={18} /> : <Menu size={18} />}</button>
      </header>
      <aside className={`${open ? "block" : "hidden"} fixed inset-x-0 top-[64px] z-20 bg-ink px-4 pb-6 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:shrink-0 lg:px-5 lg:py-7`}>
        <div className="hidden items-center gap-2.5 lg:flex">
          {logo ? <img src={logo} alt="" className="h-9 w-9 object-contain" /> : null}
          <div>
            <p className="font-display text-lg font-semibold leading-tight">{brand}</p>
            <p className="text-xs text-white/50">Client portal</p>
          </div>
        </div>
        {nav}
        <div className="mt-8 border-t border-white/10 pt-5 lg:absolute lg:inset-x-5 lg:bottom-6">
          <p className="truncate text-sm font-semibold">{name}</p>
          {company && <p className="truncate text-xs text-white/50">{company}</p>}
          <button onClick={logout} className="mt-3 inline-flex items-center gap-2 text-sm text-white/65 hover:text-white"><LogOut size={15} /> Log out</button>
        </div>
      </aside>
    </>
  );
}
