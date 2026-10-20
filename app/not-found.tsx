import Link from "next/link";

export default function NotFound() {
  return (
    <section className="grid min-h-[80vh] place-items-center bg-ink px-6 text-center text-white">
      <div>
        <p className="h-display text-[9rem] leading-none text-lav-300 sm:text-[12rem]">404</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">This page doesn&apos;t exist.</h1>
        <p className="mt-3 text-white/60">The link may be old or mistyped.</p>
        <Link href="/" className="btn-light mt-8">Go to homepage</Link>
      </div>
    </section>
  );
}
