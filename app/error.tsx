"use client";

import ErrorView from "@/components/ErrorView";

// Pages outside the website layout (for example a shared quotation link).
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} />;
}
