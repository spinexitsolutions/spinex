import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import VerifyCertificate from "@/components/VerifyCertificate";

export const metadata: Metadata = { title: "Verify a certificate", description: "Check whether a Spinex IT Solutions internship certificate is genuine." };

// Heading and intro render on the server so they're in the static HTML; only the
// form (which reads ?id= from the URL) waits for the client.
export default function VerifyPage() {
  return (
    <section className="relative min-h-[85svh] overflow-hidden bg-ink pb-24 pt-36 text-white grain">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-lav-600/25 blur-[130px]" />
      <div className="container-x relative max-w-3xl">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lav-600"><ShieldCheck size={26} /></span>
        <h1 className="h-display mt-6 text-5xl sm:text-6xl">Verify a certificate</h1>
        <p className="mt-4 max-w-lg text-lg text-white/65">Enter the certificate number printed at the bottom of a Spinex internship certificate.</p>
        <Suspense fallback={<div aria-hidden className="mt-10 h-14 rounded-full border border-white/15 bg-white/5" />}>
          <VerifyCertificate />
        </Suspense>
      </div>
    </section>
  );
}
