import { Fragment } from "react";
import type { SiteContent } from "@/lib/content";
import { LETTER_FONT, letterFontVars } from "../letters/fonts";

// The company profile brochure: A4 pages built from the site content and Admin → Company profile.
// Each page is exactly one A4 sheet on screen and in the PDF.
const ACCENT = "#6e59d9";

export default function ProfileDocument({ content, qr }: { content: SiteContent; qr: string }) {
  const p = content.profile;
  const name = content.brand.name || "Spinex IT Solutions";
  const c = content.contact;
  const address = p.address.trim() || c.location;
  const website = p.website.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const about = (p.about.trim() || [content.about.body, content.about.philosophy].filter(Boolean).join("\n\n")).split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const stats = content.stats.filter((s) => s.value.trim()).slice(0, 4);
  const services = content.services.slice(0, 8);
  const industries = content.industries.filter((i) => i.title.trim()).slice(0, 8);
  const process = content.process.slice(0, 5);
  const projects = content.projects.filter((x) => !x.hidePage && x.title.trim()).slice(0, 4);
  const quotes = content.testimonials.filter((t) => String(t.quote || "").trim()).slice(0, 2);

  const sheets: { key: string; node: React.ReactNode }[] = [];
  sheets.push({ key: "cover", node: <Cover content={content} name={name} website={website} /> });
  sheets.push({
    key: "about",
    node: (
      <Sheet>
        <Eyebrow>About us</Eyebrow>
        <h2 className="mt-3 font-display text-[40px] font-semibold leading-[1.06] tracking-tight">{p.aboutHeading || content.about.title}</h2>
        <div className="mt-8 grid grid-cols-[1.2fr_1fr] gap-8">
          <div className="space-y-4 text-[14.5px] leading-[1.75] text-[#3b3650]">{about.map((t, i) => <p key={i}>{t}</p>)}</div>
          {content.about.image ? <img src={content.about.image} alt="" className="h-[88mm] w-full rounded-[20px] object-cover" /> : <div className="h-[88mm] rounded-[20px] bg-[#eeeafd]" />}
        </div>
        <div className="mt-10 grid grid-cols-2 gap-5">
          {p.mission && <Box title="Our mission" text={p.mission} dark />}
          {p.vision && <Box title="Our vision" text={p.vision} />}
        </div>
        {p.show.stats && stats.length > 0 && (
          <div className="mt-10 grid grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.id} className="rounded-[18px] border border-[#e6e3ef] px-5 py-6">
                <p className="font-display text-[30px] font-semibold leading-none tracking-tight" style={{ color: ACCENT }}>{s.value}</p>
                <p className="mt-2.5 text-[12px] leading-snug text-[#6b6680]">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    ),
  });
  if (p.show.services && services.length) {
    sheets.push({
      key: "services",
      node: (
        <Sheet>
          <Eyebrow>What we do</Eyebrow>
          <h2 className="mt-3 font-display text-[40px] font-semibold leading-[1.06] tracking-tight">{content.sections.services.heading || "Our services"}</h2>
          {content.sections.services.intro && <p className="mt-4 max-w-[150mm] text-[14px] text-[#6b6680]">{content.sections.services.intro}</p>}
          <div className="mt-9 grid grid-cols-2 gap-4">
            {services.map((s, i) => (
              <div key={s.id} className="rounded-[18px] border border-[#e6e3ef] p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: ACCENT }}>{String(i + 1).padStart(2, "0")}</span>
                  <p className="font-display text-[18px] font-semibold leading-tight">{s.title}</p>
                </div>
                <p className="mt-3 line-clamp-4 text-[12.5px] leading-[1.65] text-[#4b465e]">{s.description || s.short}</p>
                {s.tags.length > 0 && <p className="mt-3 truncate text-[11px] font-semibold" style={{ color: ACCENT }}>{s.tags.slice(0, 4).join(" · ")}</p>}
              </div>
            ))}
          </div>
        </Sheet>
      ),
    });
  }
  const showIndustries = p.show.industries && industries.length > 0;
  const showProcess = p.show.process && process.length > 0;
  if (showIndustries || showProcess) {
    sheets.push({
      key: "how",
      node: (
        <Sheet>
          {showIndustries && (
            <>
              <Eyebrow>Who we work with</Eyebrow>
              <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.08] tracking-tight">{content.sections.industries.heading || "Industries we serve"}</h2>
              <div className="mt-7 grid grid-cols-2 gap-4">
                {industries.map((ind) => (
                  <div key={ind.id} className="rounded-[16px] bg-[#f5f4fa] px-5 py-5">
                    <p className="text-[15.5px] font-bold">{ind.title}</p>
                    <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-[1.6] text-[#6b6680]">{ind.description}</p>
                    {ind.points.length > 0 && <p className="mt-2 truncate text-[11px] font-semibold" style={{ color: ACCENT }}>{ind.points.slice(0, 3).join(" · ")}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
          {showProcess && (
            <div className={showIndustries ? "mt-12" : ""}>
              <Eyebrow>How we work</Eyebrow>
              <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.08] tracking-tight">{content.sections.process.heading || "Our process"}</h2>
              <div className="relative mt-7 space-y-6 pl-12">
                <span aria-hidden className="absolute bottom-4 left-[17px] top-4 w-[2px] bg-[#e6e3ef]" />
                {process.map((st, i) => (
                  <div key={st.id} className="relative">
                    <span className="absolute -left-12 top-0 grid h-9 w-9 place-items-center rounded-full bg-[#14111f] text-[13px] font-bold text-white">{i + 1}</span>
                    <p className="text-[16px] font-bold">{st.title}{st.time && <span className="ml-2 text-[11px] font-semibold" style={{ color: ACCENT }}>{st.time}</span>}</p>
                    <p className="mt-0.5 text-[13px] leading-[1.6] text-[#4b465e]">{st.text}</p>
                    {st.gets.length > 0 && <p className="mt-1 text-[11.5px] font-semibold" style={{ color: ACCENT }}>{st.gets.join(" · ")}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Sheet>
      ),
    });
  }
  const showWork = p.show.work && projects.length > 0;
  const showQuotes = p.show.testimonials && quotes.length > 0;
  if (showWork || showQuotes) {
    sheets.push({
      key: "work",
      node: (
        <Sheet>
          <Eyebrow>Our work</Eyebrow>
          <h2 className="mt-3 font-display text-[40px] font-semibold leading-[1.06] tracking-tight">{showWork ? "Selected projects" : "What our clients say"}</h2>
          {showWork && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              {projects.map((x) => (
                <div key={x.id} className="overflow-hidden rounded-[16px] border border-[#e6e3ef]">
                  {x.image ? <img src={x.image} alt="" className="h-[38mm] w-full object-cover" /> : <div className="h-[38mm] bg-[#eeeafd]" />}
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: ACCENT }}>{x.category}</p>
                    <p className="mt-0.5 font-display text-[15px] font-semibold leading-tight">{x.title}</p>
                    {x.summary && <p className="mt-1 line-clamp-2 text-[11px] leading-[1.55] text-[#6b6680]">{x.summary}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showQuotes && (
            <div className={`${showWork ? "mt-5" : "mt-7"} grid grid-cols-2 gap-4`}>
              {quotes.map((q) => (
                <figure key={q.id} className="rounded-[16px] bg-[#14111f] p-5 text-white">
                  <blockquote className="line-clamp-5 text-[12.5px] leading-[1.6]">“{q.quote.trim()}”</blockquote>
                  <figcaption className="mt-3 text-[11px] text-white/60"><b className="text-white">{q.name}</b>{q.role ? `, ${q.role}` : ""}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </Sheet>
      ),
    });
  }
  sheets.push({ key: "contact", node: <Back content={content} name={name} website={website} address={address} qr={qr} /> });

  return (
    <div className={`${letterFontVars} space-y-8 print:space-y-0`} style={{ fontFamily: LETTER_FONT, fontKerning: "normal", letterSpacing: 0, textRendering: "geometricPrecision" }}>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print { .profile-sheet { box-shadow: none !important; margin: 0 !important; break-after: page; } .profile-sheet:last-child { break-after: auto; } }
      `}</style>
      {sheets.map((s, i) => (
        <Fragment key={s.key}>
          <div className="profile-sheet relative mx-auto h-[297mm] w-[210mm] overflow-hidden bg-white text-[#14111f] shadow-[0_20px_60px_-30px_rgba(18,15,27,.45)]">
            {s.node}
            {i > 0 && i < sheets.length - 1 && (
              <div className="absolute inset-x-[16mm] bottom-[10mm] flex justify-between border-t border-[#e6e3ef] pt-2 text-[9.5px] text-[#8a8499]">
                <span>{name} · {p.title} {p.year}</span>
                <span>{website}</span>
                <span>{String(i + 1).padStart(2, "0")}</span>
              </div>
            )}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full px-[16mm] pb-[22mm] pt-[20mm]">
      <div aria-hidden className="absolute left-0 top-0 h-[5px] w-[60mm]" style={{ background: ACCENT }} />
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>{children}</p>;
}

function Box({ title, text, dark = false }: { title: string; text: string; dark?: boolean }) {
  return (
    <div className={`rounded-[20px] p-7 ${dark ? "bg-[#14111f] text-white" : "bg-[#eeeafd]"}`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${dark ? "text-[#b9adfc]" : ""}`} style={dark ? undefined : { color: ACCENT }}>{title}</p>
      <p className="mt-3 text-[15px] leading-[1.65]">{text}</p>
    </div>
  );
}

function Cover({ content, name, website }: { content: SiteContent; name: string; website: string }) {
  const p = content.profile;
  const c = content.contact;
  return (
    <div className="relative flex h-full flex-col bg-[#14111f] text-white">
      <div aria-hidden className="absolute -right-[40mm] -top-[40mm] h-[140mm] w-[140mm] rounded-full bg-[#6e59d9]/40 blur-[60px]" />
      <div className="relative flex items-center gap-3 px-[16mm] pt-[16mm]">
        {content.brand.logo ? <img src={content.brand.logo} alt="" className="h-11 w-auto object-contain" /> : null}
        <p className="font-display text-[20px] font-semibold">{name}</p>
      </div>
      <div className="relative px-[16mm] pt-[30mm]">
        <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#b9adfc]">{p.year}</p>
        <h1 className="mt-3 font-display text-[64px] font-semibold leading-[0.95] tracking-tight">{p.title}</h1>
        {p.tagline && <p className="mt-6 max-w-[140mm] text-[16px] leading-[1.6] text-white/70">{p.tagline}</p>}
      </div>
      {p.cover ? (
        <div className="relative mx-[16mm] mt-auto h-[95mm] overflow-hidden rounded-[22px]">
          <img src={p.cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#14111f]/60 to-transparent" />
        </div>
      ) : <div className="mt-auto" />}
      <div className="relative grid grid-cols-3 gap-4 px-[16mm] pb-[14mm] pt-[8mm] text-[11.5px]">
        {c.phone && <p><span className="block text-white/45">Phone</span>+91 {c.phone}</p>}
        {c.email && <p className="truncate"><span className="block text-white/45">Email</span>{c.email}</p>}
        {website && <p><span className="block text-white/45">Website</span>{website}</p>}
      </div>
    </div>
  );
}

function Back({ content, name, website, address, qr }: { content: SiteContent; name: string; website: string; address: string; qr: string }) {
  const p = content.profile;
  const c = content.contact;
  const social = [["Instagram", c.instagram], ["LinkedIn", c.linkedin], ["YouTube", c.youtube]].filter(([, v]) => v) as [string, string][];
  return (
    <div className="flex h-full flex-col">
      <div className="px-[16mm] pt-[18mm]">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Why choose us</p>
        <h2 className="mt-3 font-display text-[40px] font-semibold leading-[1.06] tracking-tight">Why businesses work with {name}</h2>
        <ul className="mt-8 grid grid-cols-2 gap-4">
          {p.highlights.filter(Boolean).map((h) => (
            <li key={h} className="flex gap-3 rounded-[16px] border border-[#e6e3ef] px-5 py-4 text-[14px] leading-[1.5]">
              <span className="mt-[2px] grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: ACCENT }}>✓</span>
              {h}
            </li>
          ))}
        </ul>
        {content.services.length > 0 && (
          <div className="mt-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Services at a glance</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {content.services.map((sv) => <span key={sv.id} className="rounded-full bg-[#eeeafd] px-4 py-2 text-[13px] font-semibold text-[#4a3aa8]">{sv.title}</span>)}
            </div>
          </div>
        )}
      </div>
      <div className="relative mt-auto overflow-hidden bg-[#14111f] px-[16mm] pb-[18mm] pt-[18mm] text-white">
        <div aria-hidden className="absolute -left-[30mm] -bottom-[40mm] h-[110mm] w-[110mm] rounded-full bg-[#6e59d9]/35 blur-[60px]" />
        <div className="relative">
          <h2 className="max-w-[160mm] font-display text-[38px] font-semibold leading-[1.1] tracking-tight">{p.ctaHeading}</h2>
          {p.ctaText && <p className="mt-4 max-w-[150mm] text-[14.5px] leading-[1.6] text-white/70">{p.ctaText}</p>}
          <div className="mt-8 grid grid-cols-[1fr_auto] items-end gap-8">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-[14px]">
              {c.phone && <p><span className="block text-[11px] text-white/45">Call or WhatsApp</span>+91 {c.phone}</p>}
              {c.email && <p className="break-all"><span className="block text-[11px] text-white/45">Email</span>{c.email}</p>}
              {website && <p><span className="block text-[11px] text-white/45">Website</span>{website}</p>}
              {address && <p><span className="block text-[11px] text-white/45">Office</span>{address}</p>}
              {social.length > 0 && <p className="col-span-2"><span className="block text-[11px] text-white/45">Follow us</span>{social.map(([k]) => k).join(" · ")}</p>}
            </div>
            {qr && (
              <div className="text-center">
                <img src={qr} alt="" className="h-[34mm] w-[34mm] rounded-[12px] bg-white p-2" />
                <p className="mt-1.5 text-[10px] text-white/55">Scan to visit</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
