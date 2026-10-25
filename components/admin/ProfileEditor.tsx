"use client";

import { ExternalLink, FileDown } from "lucide-react";
import type { CompanyProfile } from "@/lib/content";
import { ObjectEditor } from "./fields";

// Admin → Company profile: the brochure's own words and which sections it shows.
// Services, projects, testimonials, process, industries and numbers come from their own sections.
const SECTIONS: { key: keyof CompanyProfile["show"]; label: string; from: string }[] = [
  { key: "stats", label: "Numbers", from: "About and stats" },
  { key: "services", label: "Services (up to 8)", from: "Services" },
  { key: "industries", label: "Industries (up to 8)", from: "Industries" },
  { key: "process", label: "How we work (up to 5 steps)", from: "Process steps" },
  { key: "work", label: "Selected projects (up to 4)", from: "Projects" },
  { key: "testimonials", label: "Client quotes (up to 2)", from: "Testimonials" },
];

export default function ProfileEditor({ value, onChange }: { value: CompanyProfile; onChange: (v: CompanyProfile) => void }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-white p-5">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Your company profile brochure</p>
          <p className="text-sm text-muted">Save and publish first, then open it to see the latest version and download the PDF.</p>
        </div>
        <a href="/company-profile" target="_blank" rel="noreferrer" className="btn-ghost px-4 py-2.5 text-sm"><ExternalLink size={15} /> Open</a>
        <a href="/company-profile" target="_blank" rel="noreferrer" className="btn-dark px-4 py-2.5 text-sm"><FileDown size={15} /> Download PDF</a>
      </div>

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-lav-600" checked={value.public} onChange={(e) => onChange({ ...value, public: e.target.checked })} />
          <span>
            <span className="block font-semibold">Anyone with the link can open it</span>
            <span className="block text-sm text-muted">Shows “Company profile (PDF)” in the website footer, so you can also send the link /company-profile to clients. Turn off to keep it for logged-in team members only.</span>
          </span>
        </label>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <h3 className="mb-4 font-display text-lg font-semibold">Cover page</h3>
        <ObjectEditor value={value} onChange={onChange} fields={[
          { key: "title", label: "Title", hint: "e.g. Company Profile" },
          { key: "year", label: "Year" },
          { key: "tagline", label: "Tagline", type: "textarea" },
          { key: "cover", label: "Cover photo", type: "image" },
        ]} />
      </section>

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <h3 className="mb-4 font-display text-lg font-semibold">About us page</h3>
        <ObjectEditor value={value} onChange={onChange} fields={[
          { key: "aboutHeading", label: "Heading" },
          { key: "about", label: "About text", type: "textarea", hint: "leave empty to use the text from About and stats. Blank line = new paragraph." },
          { key: "mission", label: "Our mission", type: "textarea" },
          { key: "vision", label: "Our vision", type: "textarea" },
        ]} />
      </section>

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <h3 className="font-display text-lg font-semibold">Pages to include</h3>
        <p className="mb-4 mt-1 text-sm text-muted">Each part takes its content from the section named on the right. Empty sections are left out on their own.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <label key={s.key} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 ${value.show[s.key] ? "border-lav-500 bg-lav-100/50" : "border-line"}`}>
              <input type="checkbox" className="h-4 w-4 accent-lav-600" checked={value.show[s.key]} onChange={(e) => onChange({ ...value, show: { ...value.show, [s.key]: e.target.checked } })} />
              <span className="min-w-0 flex-1 text-sm font-semibold">{s.label}</span>
              <span className="text-xs text-muted">from {s.from}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <h3 className="mb-4 font-display text-lg font-semibold">Last page: why us and contact</h3>
        <ObjectEditor value={value} onChange={onChange} fields={[
          { key: "highlights", label: "Why choose us", type: "lines", hint: "4–6 short points" },
          { key: "ctaHeading", label: "Closing heading" },
          { key: "ctaText", label: "Closing text", type: "textarea" },
          { key: "address", label: "Office address", hint: "leave empty to use Contact details" },
          { key: "website", label: "Website", hint: "printed on every page and in the QR code" },
        ]} />
        <p className="mt-4 text-sm text-muted">Phone, email and social links come from Contact details. The logo comes from Brand and hero.</p>
      </section>
    </div>
  );
}
