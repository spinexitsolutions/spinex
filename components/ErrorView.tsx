"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

// Friendly page shown when something on a page breaks, with a "Try again" button.
export default function ErrorView({ error, reset, home = "/", homeLabel = "Go to homepage" }: { error: Error & { digest?: string }; reset: () => void; home?: string; homeLabel?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="grid min-h-[80vh] place-items-center bg-ink px-6 py-20 text-center text-white">
      <div className="max-w-lg">
        <p className="h-display text-[6rem] leading-none text-lav-300 sm:text-[8rem]">Oops</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">Something went wrong on our side.</h1>
        <p className="mt-3 text-white/60">It&apos;s not you. Please try again. If it keeps happening, message us and we&apos;ll fix it quickly.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="btn-light"><RotateCcw size={17} /> Try again</button>
          <Link href={home} className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-6 font-semibold text-white hover:bg-white/10">{homeLabel}</Link>
        </div>
        {error.digest && <p className="mt-8 text-xs text-white/35">Error code: {error.digest}</p>}
      </div>
    </section>
  );
}
