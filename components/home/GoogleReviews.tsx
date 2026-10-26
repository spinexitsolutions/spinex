import { ExternalLink, PenLine, Star } from "lucide-react";
import { hasDb } from "@/lib/db";
import { siteReviews } from "@/lib/reviews-db";

// Home page: Google rating, review count and a few recent reviews (live from Google, or typed in Admin → Google reviews).
// Hidden when turned off or when there is nothing to show.
function Stars({ n, size = 16 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, n - i + 1));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-amber-300/40" fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}><Star size={size} className="text-amber-400" fill="currentColor" strokeWidth={0} /></span>
          </span>
        );
      })}
    </span>
  );
}

const GoogleG = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export default async function GoogleReviews() {
  if (!hasDb()) return null;
  const d = await siteReviews().catch(() => null);
  if (!d) return null;
  return (
    <section className="bg-mist py-20 sm:py-28" aria-labelledby="google-reviews-title">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted"><GoogleG /> Google reviews</p>
            <h2 id="google-reviews-title" className="h-display mt-3 text-4xl sm:text-5xl">{d.title}</h2>
            {d.rating > 0 && (
              <p className="mt-4 flex flex-wrap items-center gap-3">
                <span className="font-display text-5xl font-semibold tabular-nums">{d.rating.toFixed(1)}</span>
                <span><Stars n={d.rating} size={22} />{d.count > 0 && <span className="block text-sm text-muted">Based on {d.count.toLocaleString("en-IN")} Google review{d.count === 1 ? "" : "s"}</span>}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {d.mapsUrl && <a href={d.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost bg-white px-5 py-3 text-sm"><ExternalLink size={15} /> See all on Google</a>}
            {d.reviewUrl && <a href={d.reviewUrl} target="_blank" rel="noopener noreferrer" className="btn-dark px-5 py-3 text-sm"><PenLine size={15} /> Write a review</a>}
          </div>
        </div>
        {d.reviews.length > 0 && (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.reviews.map((r) => (
              <li key={r.id} className="flex flex-col rounded-[24px] border border-line bg-white p-6">
                <div className="flex items-center gap-3">
                  {r.photo ? <img src={r.photo} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-lav-100 font-semibold text-lav-700">{r.name.charAt(0).toUpperCase()}</span>}
                  <span className="min-w-0 flex-1">
                    {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold hover:underline">{r.name}</a> : <span className="block truncate font-semibold">{r.name}</span>}
                    {r.when && <span className="block text-xs text-muted">{r.when}</span>}
                  </span>
                  <GoogleG />
                </div>
                <div className="mt-3"><Stars n={r.rating} /></div>
                <p className="mt-3 line-clamp-6 whitespace-pre-line text-[15px] leading-relaxed text-ink/80">{r.text}</p>
              </li>
            ))}
          </ul>
        )}
        {d.fromGoogle && <p className="mt-6 text-xs text-muted">Reviews and rating from Google.</p>}
      </div>
    </section>
  );
}
