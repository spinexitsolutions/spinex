"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Loader2, SearchX } from "lucide-react";
import { formatDate } from "@/lib/interns";
import { ease } from "./Reveal";

type Result = { valid: boolean; error?: string; kind?: "certificate" | "letter"; letterType?: string; number?: string; certId?: string; name?: string; role?: string; startDate?: string; endDate?: string; issuedOn?: string };

// The form and result. The page renders the section shell and heading on the server.
export default function VerifyCertificate() {
  const initial = useSearchParams().get("id") ?? "";
  const [id, setId] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const check = async (value: string) => {
    const v = value.trim().toUpperCase();
    if (!v) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/verify?id=${encodeURIComponent(v)}`);
      setResult(await res.json());
    } catch {
      setResult({ valid: false, error: "Couldn't check right now. Try again." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initial) check(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
        <form onSubmit={(e) => { e.preventDefault(); check(id); }} className="mt-10 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Certificate or letter number</span>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="SPX-2026-0001"
              className="h-14 w-full rounded-full border border-white/15 bg-white/5 px-6 font-mono text-lg uppercase tracking-wide text-white outline-none placeholder:text-white/35 focus:border-lav-400"
              autoComplete="off"
            />
          </label>
          <button disabled={loading || !id.trim()} className="btn-light h-14 px-8 disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Check"}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div key={JSON.stringify(result)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease }} className="mt-8" role="status">
              {result.valid ? (
                <div className="overflow-hidden rounded-[24px] bg-white text-ink">
                  <div className="flex items-center gap-3 bg-emerald-50 px-6 py-4 text-emerald-800">
                    <BadgeCheck size={22} /> <span className="font-semibold">{result.kind === "letter" ? `Genuine ${result.letterType?.toLowerCase() ?? "letter"}` : "Genuine certificate"}</span>
                  </div>
                  <dl className="grid gap-5 p-6 sm:grid-cols-2">
                    <Item label="Name" value={result.name} />
                    {result.kind === "letter" ? (
                      <>
                        <Item label="Document" value={result.letterType} />
                        {result.role && <Item label="Role" value={result.role} />}
                        <Item label="Dated" value={formatDate(result.issuedOn ?? "")} />
                        <Item label="Reference no." value={result.number} mono />
                        <Item label="Verification code" value={result.certId} mono />
                      </>
                    ) : (
                      <>
                        <Item label="Role" value={result.role} />
                        <Item label="Internship" value={[formatDate(result.startDate ?? ""), formatDate(result.endDate ?? "")].filter(Boolean).join(" to ")} />
                        <Item label="Issued on" value={formatDate(result.issuedOn ?? "")} />
                        <Item label="Certificate number" value={result.certId} mono />
                      </>
                    )}
                  </dl>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-[24px] border border-red-300/40 bg-red-500/10 p-6">
                  <SearchX size={22} className="mt-0.5 shrink-0 text-red-300" />
                  <div>
                    <p className="font-semibold">{result.error ?? "No certificate or letter found with this number."}</p>
                    {!result.error && <p className="mt-1 text-white/65">Check the number for typos. If it still doesn&apos;t match, it wasn&apos;t issued by Spinex.</p>}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
    </>
  );
}

function Item({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`mt-0.5 text-lg font-semibold ${mono ? "font-mono" : ""}`}>{value || "Not set"}</dd>
    </div>
  );
}
