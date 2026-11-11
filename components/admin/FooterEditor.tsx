"use client";

import { Eye, EyeOff } from "lucide-react";
import type { FooterLink, FooterSettings, SiteContent } from "@/lib/content";
import { FOOTER_PARTS, footerLinks, footerSettings, type FooterItem } from "@/lib/footer";
import { ListEditor, ObjectEditor, uid } from "./fields";

// Admin → Site settings → Footer. Every link and part of the footer can be shown or hidden,
// column titles renamed, and own links added. Uses the same link list as the real footer.
export default function FooterEditor({ draft, onChange }: { draft: SiteContent; onChange: (ft: FooterSettings) => void }) {
  const ft = footerSettings(draft);
  const hidden = new Set(ft.hide);
  const set = (v: Partial<FooterSettings>) => onChange({ ...ft, ...v });
  const toggle = (key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key); else next.add(key);
    set({ hide: [...next] });
  };
  const all = footerLinks(draft, ft.products && draft.products.length > 0);

  const Row = ({ item, sub }: { item: { key: string; label: string; href?: string }; sub?: boolean }) => {
    const on = !hidden.has(item.key);
    return (
      <button
        type="button"
        onClick={() => toggle(item.key)}
        data-footer-toggle={item.key}
        className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${on ? "border-line bg-white hover:border-ink/30" : "border-dashed border-line bg-mist text-muted"} ${sub ? "ml-0" : ""}`}
      >
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${on ? "bg-emerald-50 text-emerald-600" : "bg-white text-muted"}`}>
          {on ? <Eye size={15} /> : <EyeOff size={15} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[14.5px] font-medium ${on ? "" : "line-through decoration-1"}`}>{item.label}</span>
          {item.href && <span className="block truncate text-xs text-muted">{item.href}</span>}
        </span>
        <span className={`shrink-0 text-xs font-semibold ${on ? "text-emerald-600" : "text-muted"}`}>{on ? "Shown" : "Hidden"}</span>
      </button>
    );
  };

  const Group = ({ title, colKey, items, note }: { title: string; colKey?: string; items: FooterItem[]; note?: string }) => {
    const colOff = colKey ? hidden.has(colKey) : false;
    return (
      <div className="rounded-2xl border border-line p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">{title}</p>
          <div className="flex gap-2 text-xs">
            <button type="button" className="rounded-full border border-line px-2.5 py-1 hover:border-ink" onClick={() => set({ hide: ft.hide.filter((k) => !items.some((i) => i.key === k)) })}>Show all</button>
            <button type="button" className="rounded-full border border-line px-2.5 py-1 hover:border-ink" onClick={() => set({ hide: [...new Set([...ft.hide, ...items.map((i) => i.key)])] })}>Hide all</button>
          </div>
        </div>
        {note && <p className="mb-3 text-sm text-muted">{note}</p>}
        {colOff ? (
          <p className="rounded-xl bg-mist px-3.5 py-3 text-sm text-muted">This whole column is hidden. Turn it on under &quot;Parts of the footer&quot;.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((i) => <Row key={i.key} item={i} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-footer-settings>
      <p className="text-sm text-muted">Click any item to show or hide it in the footer. Changes appear in the preview straight away and go live when you press Save.</p>

      <div className="rounded-2xl border border-line p-4">
        <p className="mb-3 font-semibold">Parts of the footer</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {FOOTER_PARTS.map((p) => <Row key={p.key} item={p} />)}
        </div>
      </div>

      <Group title={`${ft.titles.services} column`} colKey="col:services" items={all.services} note="Your services (from Services) and any own links you add to this column." />
      <Group title={`${ft.titles.company} column`} colKey="col:company" items={all.company} note="City pages appear here when they are switched on in City pages." />
      <Group title="Links at the very bottom" items={all.legal} />

      <div className="rounded-2xl border border-line p-4">
        <p className="mb-3 font-semibold">Products column</p>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={ft.products} onChange={(e) => set({ products: e.target.checked })} />
          <span className="font-medium">Show the &quot;{ft.titles.products}&quot; column with pictures</span>
        </label>
        {ft.products && (
          <label className="mt-4 flex items-center gap-3 text-sm">
            <span>How many products</span>
            <select className="input w-24" value={ft.productsCount} onChange={(e) => set({ productsCount: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-muted">The first ones in Products, in that order.</span>
          </label>
        )}
        {!ft.products && <p className="mt-2 text-sm text-muted">When this is off, an &quot;Our products&quot; link is added to the Company column instead.</p>}
      </div>

      <div className="rounded-2xl border border-line p-4">
        <p className="mb-3 font-semibold">Column titles and text</p>
        <ObjectEditor value={ft.titles} onChange={(v) => set({ titles: v })} fields={[
          { key: "services", label: "Services column title" },
          { key: "company", label: "Company column title" },
          { key: "products", label: "Products column title" },
        ]} />
        <div className="mt-5">
          <ObjectEditor value={ft} onChange={(v) => set({ wordmark: v.wordmark, copyright: v.copyright })} fields={[
            { key: "wordmark", label: "Big word at the bottom", hint: "Shown with wide letter spacing, e.g. SPINEX. Leave empty to hide it" },
            { key: "copyright", label: "Copyright line", hint: `Shown after "© ${new Date().getFullYear()}". Leave empty for "${draft.brand.name}. All rights reserved."` },
          ]} />
        </div>
        <label className="mt-4 flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={ft.animate} onChange={(e) => set({ animate: e.target.checked })} />
          <span className="font-medium">Animate the big word (letters open up from a soft blur)</span>
        </label>
      </div>

      <div className="rounded-2xl border border-line p-4">
        <p className="mb-1 font-semibold">Your own links</p>
        <p className="mb-4 text-sm text-muted">Add any link to a column, e.g. a page of your site (/book) or another website (https://…, opens in a new tab).</p>
        <ListEditor<FooterLink>
          items={ft.extra}
          onChange={(v) => set({ extra: v })}
          titleKey="label"
          subKey="href"
          thumb={false}
          addLabel="Add a link"
          newItem={() => ({ id: uid(), label: "", href: "", column: "company" })}
          fields={[
            { key: "label", label: "Link text" },
            { key: "href", label: "Opens", hint: "e.g. /book or https://agencyvault.tech" },
            { key: "column", label: "Column", type: "select", options: [
              { value: "company", label: ft.titles.company },
              { value: "services", label: ft.titles.services },
              { value: "legal", label: "Bottom row (next to Privacy Policy)" },
            ] },
          ]}
        />
      </div>

      <p className="text-sm text-muted">Email, phone and social links come from Contact details. The short line under the logo is the brand tagline.</p>
    </div>
  );
}
