"use client";

import { useState } from "react";
import { ExternalLink, MapPin, Plus, Trash2 } from "lucide-react";
import { cityPath, citySlug, type CityPage } from "@/lib/content";
import { ListEditor, ObjectEditor, uid } from "./fields";

// Admin → City pages: one local SEO page per city (/website-development-jaipur …).
const blankCity = (): CityPage => ({
  id: uid(), show: false, city: "", state: "Rajasthan", slug: "", heading: "", intro: "", metaTitle: "", metaDescription: "",
  stats: [], services: [], why: [], areas: [], faqs: [], nearby: [],
});

export default function CitiesEditor({ cities, onChange }: { cities: CityPage[]; onChange: (v: CityPage[]) => void }) {
  const [openId, setOpenId] = useState(cities[0]?.id ?? "");
  const [askDelete, setAskDelete] = useState(false);
  const city = cities.find((c) => c.id === openId) ?? cities[0];
  const update = (patch: Partial<CityPage>) => onChange(cities.map((c) => (c.id === city?.id ? { ...c, ...patch } : c)));

  const add = () => {
    const c = blankCity();
    onChange([...cities, c]);
    setOpenId(c.id);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <b>Write each city page in its own words.</b> Google ignores pages that only swap the city name, and too many of them can pull the whole site down. Add a city when you have real clients or work there, and keep every claim true.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {cities.map((c) => (
          <button key={c.id} onClick={() => { setOpenId(c.id); setAskDelete(false); }} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${c.id === city?.id ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"}`}>
            <MapPin size={14} /> {c.city || "New city"}
            {!c.show && <span className={`rounded-full px-2 py-0.5 text-[10px] ${c.id === city?.id ? "bg-white/15" : "bg-mist"}`}>Hidden</span>}
          </button>
        ))}
        <button onClick={add} className="btn-ghost bg-white px-4 py-2 text-sm"><Plus size={15} /> Add city</button>
      </div>

      {!city ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-muted">No city pages yet. Press Add city.</p>
      ) : (
        <>
          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <h3 className="font-display text-lg font-semibold">Page</h3>
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold">
                <input type="checkbox" className="h-4 w-4 accent-lav-600" checked={city.show} onChange={(e) => update({ show: e.target.checked })} />
                Show on website
              </label>
              {city.city && (
                <a href={cityPath(city)} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-lav-700 hover:underline">
                  {cityPath(city)} <ExternalLink size={14} />
                </a>
              )}
            </div>
            <ObjectEditor
              value={city}
              onChange={(v) => update(v)}
              fields={[
                { key: "city", label: "City", hint: "e.g. Jaipur" },
                { key: "state", label: "State" },
                { key: "slug", label: "Web address", hint: `/website-development-${citySlug(city)} (leave empty to use the city)` },
                { key: "heading", label: "Main heading", hint: "e.g. Website development company in Jaipur" },
                { key: "intro", label: "Intro", type: "textarea", hint: "2–3 lines about your work in this city" },
                { key: "metaTitle", label: "Google title", hint: `${(city.metaTitle || "").length}/60` },
                { key: "metaDescription", label: "Google description", type: "textarea", hint: `${(city.metaDescription || "").length}/160` },
              ]}
            />
          </section>

          <Block title="Numbers under the heading" note="Up to 4 short facts. Only what is true, e.g. “Jaipur · Local team you can meet”.">
            <ListEditor items={city.stats} titleKey="value" addLabel="Add number" max={4} onChange={(v) => update({ stats: v })} newItem={() => ({ id: uid(), value: "", label: "" })}
              fields={[{ key: "value", label: "Big text" }, { key: "label", label: "Small text" }]} />
          </Block>

          <Block title={`Services in ${city.city || "this city"}`} note="What you offer here, in words that fit the city's businesses. 4–6 works best.">
            <ListEditor items={city.services} titleKey="title" addLabel="Add service" onChange={(v) => update({ services: v })} newItem={() => ({ id: uid(), title: "", text: "" })}
              fields={[{ key: "title", label: "Service" }, { key: "text", label: "Short description", type: "textarea" }]} />
          </Block>

          <Block title="Why us, areas and nearby cities">
            <ObjectEditor
              value={city}
              onChange={(v) => update(v)}
              fields={[
                { key: "why", label: "Why a local team", type: "lines" },
                { key: "areas", label: "Areas you serve", type: "lines", hint: "localities, one per line" },
                { key: "nearby", label: "Nearby cities", type: "lines", hint: "linked automatically when that city also has a page" },
              ]}
            />
          </Block>

          <Block title="FAQ" note="Questions people in this city ask. They also show in Google results.">
            <ListEditor items={city.faqs} titleKey="q" addLabel="Add question" onChange={(v) => update({ faqs: v })} newItem={() => ({ id: uid(), q: "", a: "" })}
              fields={[{ key: "q", label: "Question" }, { key: "a", label: "Answer", type: "textarea" }]} />
          </Block>

          <p className="text-sm text-muted">The page also shows your latest projects, testimonials, office address and a quick enquiry form. Enquiries arrive in Leads with the source “City page”. Press <b>Save and publish</b> at the top when done.</p>

          <div className="flex flex-wrap items-center gap-2">
            {askDelete ? (
              <>
                <span className="text-sm">Delete the {city.city || "new"} page?</span>
                <button onClick={() => { const rest = cities.filter((c) => c.id !== city.id); onChange(rest); setOpenId(rest[0]?.id ?? ""); setAskDelete(false); }} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">Yes, delete</button>
                <button onClick={() => setAskDelete(false)} className="btn-ghost px-4 py-2 text-sm">No</button>
              </>
            ) : (
              <button onClick={() => setAskDelete(true)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete this city page</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {note && <p className="mb-4 mt-1 text-sm text-muted">{note}</p>}
      {!note && <div className="mb-4" />}
      {children}
    </section>
  );
}
