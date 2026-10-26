"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send, Star } from "lucide-react";

const words = ["", "Poor", "Not great", "Okay", "Good", "Excellent"];

export default function FeedbackForm({ token, brand, logo, name, project, company, answered, googleUrl, cancelled }: {
  token: string; brand: string; logo: string; name: string; project: string; company: string; answered: { rating: number } | null; googleUrl: string; cancelled: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [f, setF] = useState({ liked: "", better: "", publish: true, displayName: name, role: "", company });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ googleUrl: string; rating: number } | null>(answered ? { googleUrl, rating: answered.rating } : null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setError("Choose a star rating first.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/feedback/${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rating, ...f }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't send. Please try again.");
      setDone({ googleUrl: d.googleUrl, rating });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send.");
      setBusy(false);
    }
  };

  const head = (
    <div className="mb-6 flex items-center gap-3">
      {logo ? <img src={logo} alt="" className="h-10 w-10 object-contain" /> : null}
      <p className="font-display text-lg font-semibold">{brand}</p>
    </div>
  );
  if (cancelled) return <div className="mx-auto max-w-xl">{head}<div className="rounded-[28px] border border-line bg-white p-8 text-center text-muted">This link is no longer active. Thank you!</div></div>;
  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        {head}
        <div className="rounded-[28px] border border-line bg-white p-8 text-center sm:p-10">
          <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Thank you, {name.split(" ")[0] || "for your feedback"}!</h1>
          <p className="mt-2 text-muted">{done.rating >= 4 ? "We're really glad you're happy with our work." : "Thank you for being honest. Someone from our team will get in touch to make it right."}</p>
          {done.googleUrl && (
            <div className="mt-6 rounded-2xl bg-mist p-5">
              <p className="text-sm">Would you also share a few words on Google? It helps other businesses find us.</p>
              <a href={done.googleUrl} target="_blank" rel="noopener noreferrer" className="btn-dark mt-3 px-5 py-3 text-sm"><Star size={16} /> Write a Google review</a>
            </div>
          )}
        </div>
      </div>
    );
  }
  const shown = hover || rating;
  return (
    <form onSubmit={send} className="mx-auto max-w-xl">
      {head}
      <div className="space-y-5 rounded-[28px] border border-line bg-white p-7 sm:p-9">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-lav-700">Your feedback</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">How did we do{project ? ` on ${project}` : ""}?</h1>
        </div>
        <div>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} data-star={n} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="p-1">
                <Star size={38} className={n <= shown ? "text-amber-400" : "text-line"} fill="currentColor" strokeWidth={0} />
              </button>
            ))}
          </div>
          <p className="mt-1 h-5 text-sm font-semibold text-muted">{words[shown]}</p>
        </div>
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">What did you like about working with us?</span><textarea className="input min-h-[100px]" value={f.liked} onChange={(e) => setF({ ...f, liked: e.target.value })} maxLength={1200} placeholder="e.g. The team understood what we needed and delivered on time." /></label>
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">What could we do better? <span className="font-normal text-muted">(only our team sees this)</span></span><textarea className="input min-h-[80px]" value={f.better} onChange={(e) => setF({ ...f, better: e.target.value })} maxLength={1200} /></label>
        <label className="flex items-start gap-3 rounded-2xl border border-line p-4 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={f.publish} onChange={(e) => setF({ ...f, publish: e.target.checked })} />
          <span><b>You may show what I liked on your website</b>, with my name. <span className="text-muted">We check it before it goes up.</span></span>
        </label>
        {f.publish && (
          <div className="grid gap-3 sm:grid-cols-3">
            <input className="input" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} placeholder="Your name" aria-label="Name to show" />
            <input className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Role, e.g. Owner" aria-label="Role" />
            <input className="input" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Business name" aria-label="Business name" />
          </div>
        )}
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        <button disabled={busy} className="btn-dark px-6 py-3 text-sm disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send feedback</button>
      </div>
    </form>
  );
}
