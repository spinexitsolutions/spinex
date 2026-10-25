import type { Metadata } from "next";
import { getContent } from "@/lib/content-server";
import MagicContinue from "@/components/portal/MagicContinue";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Client login", robots: { index: false, follow: false } };

export default async function MagicPage({ searchParams }: { searchParams: { t?: string } }) {
  const content = await getContent();
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4 py-16">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-lav-700">{content.brand.name}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Welcome</h1>
        <p className="mb-8 mt-2 text-muted">Press the button to open your client portal. This link works once.</p>
        <MagicContinue token={String(searchParams.t ?? "").slice(0, 80)} />
      </div>
    </main>
  );
}
