"use client";

import ErrorView from "@/components/ErrorView";

// Shown inside the normal header and footer when a page of the website breaks.
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} />;
}
